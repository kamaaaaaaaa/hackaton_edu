from django import forms
from django.utils import timezone

from .models import Event


class EventForm(forms.ModelForm):
    """Backs the add-event form on the events page."""

    class Meta:
        model = Event
        fields = ["title", "date", "type"]
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-control", "placeholder": "Например, экзамен по матанализу"}),
            "date": forms.DateInput(attrs={"class": "form-control", "type": "date"}),
            "type": forms.Select(attrs={"class": "form-select"}),
        }

    def clean_date(self):
        date = self.cleaned_data["date"]
        if date < timezone.localdate():
            raise forms.ValidationError("Дата события не может быть в прошлом.")
        return date
