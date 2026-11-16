"""No credentials, network requests, or generation charges during these checks."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('produce_intro', Path(__file__).with_name('produce_intro.py'))
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)


class ProductionGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.out = Path(self.temp.name)
        self.out_patch = patch.object(production, 'OUT', self.out)
        self.out_patch.start()
        self.config = json.loads((production.ROOT / 'docs/tasman/video/intro/production.json').read_text())
        self.model = json.loads((production.ROOT / 'docs/tasman/video/intro/selected-model.json').read_text())
        (self.out / 'selected-model.json').write_text(json.dumps(self.model))
        (self.out / 'prompt.txt').write_text('Test prompt')
        (self.out / 'references').mkdir()
        for name in ['master.png', 'opening.png', 'references/Tan-Beige_TAM_00.png', 'references/Tan-Beige_TAM_45.png']:
            (self.out / name).write_bytes(name.encode())

    def tearDown(self):
        self.out_patch.stop()
        self.temp.cleanup()

    def test_bind_exact_master_and_only_supported_settings(self):
        with patch.object(production, 'media', side_effect=lambda p, kind, *args: {'source': str(p), 'type': kind}):
            payload = production.build_payload(self.config, self.model)
        self.assertEqual(payload['frame_images'][1]['source'], str(self.out / 'master.png'))
        self.assertEqual(payload['frame_images'][1]['frame_type'], 'last_frame')
        self.assertEqual(payload['model'], 'bytedance/seedance-2.5')
        self.assertFalse(payload['generate_audio'])
        self.assertFalse(any('TAM_45.png' in p['source'] for p in payload['input_references']))

    def test_do_not_invent_1080p_support(self):
        self.config['resolution'] = '1080p'
        with self.assertRaisesRegex(RuntimeError, 'Valor no admitido'):
            production.build_payload(self.config, self.model)

    def test_motion_guides_are_immutable_https_references(self):
        result = production.media(production.ROOT / 'docs/tasman/video/intro/orbit-guide.mp4', 'video', self.config['reference_commit'])
        self.assertTrue(result['video_url']['url'].startswith('https://raw.githubusercontent.com/'))
        self.assertIn(self.config['reference_commit'], result['video_url']['url'])
        self.assertNotIn('data:', result['video_url']['url'])
        with self.assertRaises(RuntimeError):
            production.media(production.ROOT / 'docs/tasman/video/intro/orbit-guide.mp4', 'video', 'main')

    def test_missing_secret_cannot_submit(self):
        with patch.dict(production.os.environ, {}, clear=True), patch.object(production, 'request') as request, patch.object(production, 'orbit_guide'), patch.object(production, 'build_payload', return_value={'duration':24,'resolution':'720p','aspect_ratio':'16:9','generate_audio':False}):
            with self.assertRaisesRegex(RuntimeError, 'vacío'):
                production.generate(self.config)
            request.assert_not_called()

    def test_ambiguous_previous_submission_never_reposts(self):
        (self.out / 'submission-intent.json').write_text('{}')
        with patch.dict(production.os.environ, {'OPENROUTER_API_KEY': 'not-a-real-key'}), patch.object(production, 'request') as request, patch.object(production, 'orbit_guide'), patch.object(production, 'build_payload', return_value={'duration':24,'resolution':'720p','aspect_ratio':'16:9','generate_audio':False}):
            with self.assertRaisesRegex(RuntimeError, 'intento sin recibo'):
                production.generate(self.config)
            request.assert_not_called()

    def test_completed_delivery_never_resubmits(self):
        (self.out / 'intro.mp4').write_bytes(b'test')
        (self.out / 'validation.json').write_text('{}')
        with patch.object(production, 'request') as request:
            production.generate(self.config)
            request.assert_not_called()

    def test_error_diagnostics_exclude_key_urls_and_provider_metadata(self):
        error = {'error': {'message': 'Bad request not-a-real-key https://example.com/?signed=secret', 'metadata': {'raw': 'never serialize this'}}}
        with patch.dict(production.os.environ, {'OPENROUTER_API_KEY': 'not-a-real-key'}):
            text = production.safe_api_error(json.dumps(error))
        self.assertNotIn('not-a-real-key', text)
        self.assertNotIn('example.com', text)
        self.assertNotIn('never serialize', text)

    def test_definitive_validation_rejection_is_not_an_ambiguous_paid_job(self):
        with patch.dict(production.os.environ, {'OPENROUTER_API_KEY': 'not-a-real-key'}), patch.object(production, 'request', side_effect=production.RequestRejected(400, 'Validation failed')), patch.object(production, 'orbit_guide'), patch.object(production, 'build_payload', return_value={'duration':24,'resolution':'720p','aspect_ratio':'16:9','generate_audio':False}):
            with self.assertRaises(production.RequestRejected):
                production.generate(self.config)
        self.assertFalse((self.out / 'submission-intent.json').exists())
        self.assertFalse((self.out / 'job.json').exists())
        self.assertFalse(json.loads((self.out / 'rejected-request.json').read_text())['accepted'])


if __name__ == '__main__':
    unittest.main()
