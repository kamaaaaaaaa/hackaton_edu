from django import forms

from .models import CheckIn


class CheckInForm(forms.ModelForm):
    """Backs the check-in widget on the home dashboard.

    mood/energy/stress/sleep_hours are set by JS from the widget's
    emoji/dot/pill buttons into hidden inputs sharing these field names, so
    the widgets stay pure HTML/CSS and this form only needs to validate what
    lands in POST.
    """

    class Meta:
        model = CheckIn
        fields = ["mood", "energy", "stress", "sleep_hours", "note"]
        widgets = {
            "mood": forms.HiddenInput(),
            "energy": forms.HiddenInput(),
            "stress": forms.HiddenInput(),
            "sleep_hours": forms.HiddenInput(),
            "note": forms.Textarea(),
        }
