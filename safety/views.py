from django.shortcuts import render


def crisis(request):
    return render(request, "safety/crisis.html")


def quick_help(request):
    return render(request, "safety/quick_help.html")
