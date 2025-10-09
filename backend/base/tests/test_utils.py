from django.test import TestCase

from base.utils import find_first_unmatched_parenthesis


class FindFirstUnmatchedParenthesisTests(TestCase):
    def test_no_parentheses(self):
        self.assertIsNone(find_first_unmatched_parenthesis(""))

    def test_matched_parentheses(self):
        self.assertIsNone(find_first_unmatched_parenthesis("{}"))
        self.assertIsNone(find_first_unmatched_parenthesis("{{}}"))
        self.assertIsNone(find_first_unmatched_parenthesis("text { with { nested } braces }"))

    def test_unmatched_open_parenthesis(self):
        self.assertEqual(find_first_unmatched_parenthesis("{"), "{")
        self.assertEqual(find_first_unmatched_parenthesis("{{}"), "{")
        self.assertEqual(find_first_unmatched_parenthesis("text { with { unmatched braces"), "{")

    def test_unmatched_close_parenthesis(self):
        self.assertEqual(find_first_unmatched_parenthesis("}"), "}")
        self.assertEqual(find_first_unmatched_parenthesis("{}{}}"), "}")
        self.assertEqual(find_first_unmatched_parenthesis("text } with } unmatched braces"), "}")

    def test_custom_parentheses(self):
        self.assertEqual(find_first_unmatched_parenthesis("[[[]", "[", "]"), "[")
        self.assertEqual(find_first_unmatched_parenthesis("]]]", "[", "]"), "]")
        self.assertIsNone(find_first_unmatched_parenthesis("[[]]", "[", "]"))
