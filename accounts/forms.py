from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from .models import Profile, User


class StyledAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs["class"] = "form-control"


class SignupForm(UserCreationForm):
    email = forms.EmailField(required=True)
    user_type = forms.ChoiceField(
        choices=Profile.USER_TYPE_CHOICES,
        initial="student",
        label="Я",
        widget=forms.RadioSelect,
    )
    parental_consent = forms.BooleanField(
        required=False,
        label="Согласие родителей на использование сервиса",
        help_text="Обязательно, если вам ещё нет 18 лет.",
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            if name == "parental_consent":
                # Real checkbox, styled separately in the template — not a
                # plain form-control text input.
                continue
            if name == "user_type":
                continue
            existing = field.widget.attrs.get("class", "")
            field.widget.attrs["class"] = (existing + " form-control").strip()

    def clean(self):
        cleaned_data = super().clean()
        user_type = cleaned_data.get("user_type")
        parental_consent = cleaned_data.get("parental_consent")
        if user_type == "schoolchild" and not parental_consent:
            self.add_error(
                "parental_consent",
                "Для регистрации школьника необходимо согласие родителей.",
            )
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit:
            self._save_profile(user)
        return user

    def _save_profile(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.user_type = self.cleaned_data["user_type"]
        profile.parental_consent = (
            self.cleaned_data["user_type"] == "schoolchild"
            and self.cleaned_data.get("parental_consent", False)
        )
        profile.save()
