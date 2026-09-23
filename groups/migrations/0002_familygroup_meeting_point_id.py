# Originally a plain `AddField`. Rewritten as a repair-and-add migration
# after production kept failing here with:
#   django.db.utils.ProgrammingError: relation "groups_familygroup" does not exist
# — the groups tables turned out not to exist on production Postgres at all
# despite django_migrations recording 0001_initial as applied (root cause
# unconfirmed; the fix doesn't depend on knowing why). Since this migration
# consistently failed before ever being recorded as applied, editing it in
# place (rather than layering a repair migration after it) is safe — no
# real environment has ever successfully completed the original version.
#
# Uses the real current model classes (not the historical `apps` registry)
# deliberately: the goal is "make the actual DB match models.py", and the
# historical-state machinery only complicates that for a rescue migration.

from django.db import migrations


def repair_tables_and_add_field(apps, schema_editor):
    from groups.models import FamilyGroup, FamilyMember

    existing_tables = set(schema_editor.connection.introspection.table_names())

    if FamilyGroup._meta.db_table not in existing_tables:
        # Creates it with the full current schema (meeting_point_id
        # included), so no separate add_field call is needed afterward.
        schema_editor.create_model(FamilyGroup)
        existing_tables.add(FamilyGroup._meta.db_table)
    else:
        with schema_editor.connection.cursor() as cursor:
            columns = {
                col.name
                for col in schema_editor.connection.introspection.get_table_description(
                    cursor, FamilyGroup._meta.db_table
                )
            }
        if 'meeting_point_id' not in columns:
            schema_editor.add_field(
                FamilyGroup, FamilyGroup._meta.get_field('meeting_point_id')
            )

    if FamilyMember._meta.db_table not in existing_tables:
        schema_editor.create_model(FamilyMember)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(repair_tables_and_add_field, noop_reverse),
    ]
