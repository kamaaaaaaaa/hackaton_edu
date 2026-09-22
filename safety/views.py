from django.shortcuts import render

from .crisis_contacts import CRISIS_CONTACTS


def crisis(request):
    return render(request, "safety/crisis.html", {"contacts": CRISIS_CONTACTS})


def quick_help(request):
    return render(request, "safety/quick_help.html", {"contacts": CRISIS_CONTACTS})
