from django import forms

from .models import Group


class JoinGroupForm(forms.Form):
    invite_code = forms.CharField(max_length=12, label="Код приглашения")

    def clean_invite_code(self):
        code = self.cleaned_data["invite_code"].strip().upper()
        if not Group.objects.filter(invite_code=code).exists():
            raise forms.ValidationError("Группа с таким кодом не найдена. Проверь код и попробуй снова.")
        return code

    def get_group(self):
        return Group.objects.get(invite_code=self.cleaned_data["invite_code"])
