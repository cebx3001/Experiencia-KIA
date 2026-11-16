"""Project-wide preflight for paid media. Does not alter the provider's key limits."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def confirmed_usage():
    jobs = {}
    for path in (ROOT / 'docs/tasman/video').rglob('job.json'):
        data = json.loads(path.read_text()).get('job', {})
        if data.get('id') and data.get('usage', {}).get('cost') is not None:
            jobs[data['id']] = {'cost': float(data['usage']['cost']), 'scene': path.relative_to(ROOT / 'docs/tasman/video').parts[0]}
    return jobs


def preflight(scene, seconds, key_data, catalog_model):
    budget = json.loads((ROOT / 'docs/tasman/video/budget.json').read_text())
    jobs = confirmed_usage()
    known = sum(j['cost'] for j in jobs.values())
    spent = max(known, float(key_data.get('usage') or 0))
    scene_spent = sum(j['cost'] for j in jobs.values() if j['scene'] == scene)
    reserved = round(seconds * budget['conservative_usd_per_generated_second_720p'], 2)
    if scene not in budget['scene_limits']:
        raise RuntimeError('No budget allocation for this scene')
    if scene_spent + reserved > budget['scene_limits'][scene] + 1e-6:
        raise RuntimeError('Scene budget would be exceeded; shorten or review before sending')
    if spent + reserved > budget['project_ceiling'] + 1e-6:
        raise RuntimeError('45 USD project ceiling would be exceeded')
    remaining_allocations = sum(max(0, cap - sum(j['cost'] for j in jobs.values() if j['scene'] == other))
                                for other, cap in budget['scene_limits'].items() if other != scene)
    if spent + reserved + remaining_allocations > budget['project_ceiling'] + 1e-6:
        raise RuntimeError('This request would consume another scene allocation')
    limit = key_data.get('limit_remaining')
    if limit is None and key_data.get('limit') is not None:
        limit = float(key_data['limit']) - float(key_data.get('usage') or 0)
    if limit is not None and float(limit) < reserved:
        raise RuntimeError('The configured key has insufficient remaining budget; no request sent')
    price = float((catalog_model.get('pricing_skus') or {}).get('video_tokens', 0))
    if price <= 0 or price > budget['maximum_video_token_price']:
        raise RuntimeError('Provider pricing changed or is unavailable; no automatic model/price change')
    return {'scene': scene, 'confirmed_usage': known, 'usage_used_for_guard': spent, 'project_ceiling': 45,
            'reserved_for_request': reserved, 'scene_spent': scene_spent, 'remaining_project_after_reservation': round(45 - spent - reserved, 5),
            'note': 'Conservative estimate under pinned pricing; provider key limits are not changed.'}
