from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from documents.models import DiagramType, Document, DocumentStage, DocumentStatus, MermaidDiagram
from tests.helpers import create_document, create_user


class TestUnlinkMermaidDiagram(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = create_user()
        self.client.login(username=self.user.username, password="pass")  # nosec
        self.document = Document.objects.create(
            title="Test Document",
            settings={},
            template_json={},
            stage=DocumentStage.DRAFT,
            status=DocumentStatus.INITIALIZED,
            created_by=self.user,
        )

        self.diagram = MermaidDiagram.objects.create(
            user=self.user,
            document_ref=self.document,
            diagram_type=DiagramType.FLOWCHART,
        )
        self.document.update_fields({"mermaid_diagram": self.diagram})
        self.url = "/api/v1/documents/{document_id}/unlink_mermaid_diagram/"

    def test__unlink_mermaid_diagram__valid_ids__success(self):
        response = self.client.post(self.url.format(document_id=self.document.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.document.refresh_from_db()
        self.assertIsNone(self.document.mermaid_diagram)

    def test__unlink_mermaid_diagram__call_twice__success(self):
        response = self.client.post(self.url.format(document_id=self.document.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.post(self.url.format(document_id=self.document.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test__unlink_mermaid_diagram__invalid_document_id__not_found(self):
        response = self.client.post(self.url.format(document_id="123"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestDocumentVisibility(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = create_user()
        self.user2 = create_user()
        self.superuser = create_user(is_superuser=True)

        self.client.login(username=self.user1.username, password="pass")  # nosec
        self.document1 = create_document(self.user1)
        self.document2 = create_document(self.user2)

    @staticmethod
    def build_retrieve_url(document: Document) -> str:
        return f"/api/v1/documents/{document.id}/"

    def test__list_documents__user1__document1_visible(self):
        response = self.client.get("/api/v1/documents/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.document1.id))

    def test__get_document__user1__document1_visible(self):
        response = self.client.get(self.build_retrieve_url(self.document1))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.document1.id))

    def test__get_document__user2__document2_visible(self):
        self.client.logout()
        self.client.login(username=self.user2.username, password="pass")  # nosec
        response = self.client.get(self.build_retrieve_url(self.document2))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.document2.id))

    def test__get_document__user2__document1_not_visible(self):
        self.client.logout()
        self.client.login(username=self.user2.username, password="pass")  # nosec
        response = self.client.get(self.build_retrieve_url(self.document1))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test__get_document__user3__document1_and_document2_visible(self):
        self.client.logout()
        self.client.login(username=self.superuser.username, password="pass")  # nosec
        response = self.client.get(self.build_retrieve_url(self.document1))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.document1.id))

        response = self.client.get(self.build_retrieve_url(self.document2))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.document2.id))
