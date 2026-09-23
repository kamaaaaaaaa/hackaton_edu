# Repair migration.
#
# Production's `groups_familygroup`/`groups_familymember` tables turned out
# not to exist even though `django_migrations` recorded 0001_initial as
# applied (build log: `django.db.utils.ProgrammingError: relation
# "groups_familygroup" does not exist` while applying 0002, which only ever
# ALTERs an existing table). Root cause unconfirmed — most likely the tables
# were dropped or the DB was reset out-of-band at some point without also
# clearing the migration history — but the fix doesn't need to know why:
# recreate whichever of the two tables is actually missing, using the
# historical model state as of this point (so a freshly-created FamilyGroup
# already has meeting_point_id). A complete no-op wherever the tables
# already exist (verified locally, where they do).

from django.db import migrations


def create_tables_if_missing(apps, schema_editor):
    existing = set(schema_editor.connection.introspection.table_names())

    FamilyGroup = apps.get_model('groups', 'FamilyGroup')
    if FamilyGroup._meta.db_table not in existing:
        schema_editor.create_model(FamilyGroup)
        existing.add(FamilyGroup._meta.db_table)

    FamilyMember = apps.get_model('groups', 'FamilyMember')
    if FamilyMember._meta.db_table not in existing:
        schema_editor.create_model(FamilyMember)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0002_familygroup_meeting_point_id'),
    ]

    operations = [
        migrations.RunPython(create_tables_if_missing, noop_reverse),
    ]
