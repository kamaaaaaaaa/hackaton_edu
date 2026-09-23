import json

from django.conf import settings
from django.db import migrations


def seed_assembly_points(apps, schema_editor):
    AssemblyPoint = apps.get_model('assemblypoints', 'AssemblyPoint')
    json_path = settings.BASE_DIR / 'frontend' / 'src' / 'data' / 'assemblyPoints.json'
    if not json_path.exists():
        return

    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    for item in data:
        AssemblyPoint.objects.update_or_create(
            id=item['id'],
            defaults={
                'district': item.get('district', ''),
                'name': item.get('name', ''),
                'address': item.get('address', ''),
                'lat': item.get('lat'),
                'lng': item.get('lng'),
                'type': item.get('type', ''),
                'source': item.get('source', ''),
                'geocode_confidence': item.get('geocodeConfidence'),
                'needs_review': bool(item.get('needsReview', False)),
                'geocode_method': item.get('geocodeMethod') or '',
                'geocode_provider': item.get('geocodeProvider') or '',
                'geocode_note': item.get('geocodeNote') or '',
            },
        )


def unseed_assembly_points(apps, schema_editor):
    AssemblyPoint = apps.get_model('assemblypoints', 'AssemblyPoint')
    AssemblyPoint.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('assemblypoints', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_assembly_points, unseed_assembly_points),
    ]
