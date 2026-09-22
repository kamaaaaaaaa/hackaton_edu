from django import forms

from .models import CBI_QUESTIONS, WeeklySurvey


class WeeklySurveyForm(forms.ModelForm):
    """The 6-question weekly CBI personal-burnout form.

    Field labels are swapped for the real CBI question text (CBI_QUESTIONS)
    instead of the model's plain q1..q6 field names.
    """

    class Meta:
        model = WeeklySurvey
        fields = ["q1", "q2", "q3", "q4", "q5", "q6"]
        widgets = {
            f"q{i}": forms.RadioSelect() for i in range(1, 7)
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for i, question in enumerate(CBI_QUESTIONS, start=1):
            field = self.fields[f"q{i}"]
            field.label = question
            field.required = True
