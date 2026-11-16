import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('xtrek', Path(__file__).with_name('produce.py'))
xtrek = importlib.util.module_from_spec(spec)
spec.loader.exec_module(xtrek)


class XTrekGuards(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((xtrek.OUT / 'production.json').read_text())

    def test_same_approved_master_and_bounded_references(self):
        body = xtrek.payload(self.config)
        self.assertEqual(body['frame_images'][0]['image_url'], body['frame_images'][1]['image_url'])
        self.assertEqual(body['frame_images'][0]['frame_type'], 'first_frame')
        self.assertEqual(body['frame_images'][1]['frame_type'], 'last_frame')
        self.assertFalse(body['generate_audio'])
        self.assertEqual(len(body['input_references']), 9)
        for ref in body['input_references'][-2:]:
            self.assertTrue(ref['video_url']['url'].startswith('https://raw.githubusercontent.com/'))
            self.assertIn(self.config['reference_commit'], ref['video_url']['url'])

    def test_master_cannot_be_silently_replaced(self):
        self.config['master_sha256'] = '0' * 64
        with self.assertRaisesRegex(RuntimeError, 'maestro aprobado'):
            xtrek.payload(self.config)

    def test_no_other_video_or_generated_audio_can_run(self):
        self.config['video'] = 'vadeo'
        with self.assertRaisesRegex(RuntimeError, 'solo produce X-TREK'):
            xtrek.payload(self.config)
        self.config['video'] = 'xtrek'
        self.config['generate_audio'] = True
        with self.assertRaisesRegex(RuntimeError, 'solo produce X-TREK'):
            xtrek.payload(self.config)

    def test_reuse_completed_delivery_without_connecting_or_charging(self):
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            (folder / 'production.json').write_text(json.dumps(self.config))
            (folder / 'xtrek.mp4').write_bytes(b'completed')
            (folder / 'validation.json').write_text(json.dumps({'sha256': hashlib.sha256(b'completed').hexdigest()}))
            with patch.object(xtrek, 'OUT', folder), patch.object(xtrek.core, 'request') as request:
                xtrek.main()
                request.assert_not_called()


if __name__ == '__main__':
    unittest.main()
