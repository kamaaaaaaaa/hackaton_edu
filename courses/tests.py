from django.test import TestCase
from django.urls import reverse

from .models import Course, Lesson


class CourseModelTests(TestCase):
    def test_course_creation_and_str(self):
        course = Course.objects.create(
            title='Python basics',
            slug='python-basics',
            description='Learn the basics of Python.',
        )
        self.assertEqual(Course.objects.count(), 1)
        self.assertEqual(str(course), 'Python basics')

    def test_lesson_creation_and_str(self):
        course = Course.objects.create(title='Python basics', slug='python-basics')
        lesson = Lesson.objects.create(course=course, title='Variables', order=1, content='...')
        self.assertEqual(Lesson.objects.count(), 1)
        self.assertEqual(str(lesson), 'Python basics — Variables')


class CourseListViewTests(TestCase):
    def test_list_view_status_code_empty(self):
        response = self.client.get(reverse('courses:course_list'))
        self.assertEqual(response.status_code, 200)

    def test_list_view_status_code_with_data(self):
        Course.objects.create(title='Python basics', slug='python-basics')
        response = self.client.get(reverse('courses:course_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Python basics')


class CourseDetailViewTests(TestCase):
    def setUp(self):
        self.course = Course.objects.create(title='Python basics', slug='python-basics')

    def test_detail_view_status_code_existing_slug(self):
        response = self.client.get(reverse('courses:course_detail', args=['python-basics']))
        self.assertEqual(response.status_code, 200)

    def test_detail_view_status_code_missing_slug(self):
        response = self.client.get(reverse('courses:course_detail', args=['does-not-exist']))
        self.assertEqual(response.status_code, 404)

    def test_lessons_appear_in_order(self):
        Lesson.objects.create(course=self.course, title='Second', order=2)
        Lesson.objects.create(course=self.course, title='First', order=1)
        Lesson.objects.create(course=self.course, title='Third', order=3)

        response = self.client.get(reverse('courses:course_detail', args=['python-basics']))
        self.assertEqual(response.status_code, 200)

        lessons = list(response.context['course'].lessons.all())
        self.assertEqual([lesson.title for lesson in lessons], ['First', 'Second', 'Third'])

        content = response.content.decode()
        self.assertLess(content.index('First'), content.index('Second'))
        self.assertLess(content.index('Second'), content.index('Third'))
