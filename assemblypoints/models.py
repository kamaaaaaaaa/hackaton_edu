from django.db import models


class AssemblyPoint(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    district = models.CharField(max_length=120)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    TYPE_CHOICES = [(t, t) for t in
        ('school', 'kindergarten', 'university', 'college', 'stadium', 'arena')]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    source = models.TextField()
    geocode_confidence = models.FloatField(null=True, blank=True)
    needs_review = models.BooleanField(default=False)
    geocode_method = models.CharField(max_length=32, blank=True, default='')
    geocode_provider = models.CharField(max_length=32, blank=True, default='')
    geocode_note = models.TextField(blank=True, default='')

    def __str__(self):
        return f'{self.name} ({self.id})'
