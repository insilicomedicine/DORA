from django.test import TestCase

from documents.transparency.defs import ToolStatus
from documents.transparency.utils import ToolInputOutputFormatter, create_tool_level_record, hash_md5


class TestFormatDiffExpTableToColumn(TestCase):
    input_data = [
        {
            "dataset_name": "Dataset1",
            "technology": "TECH1",
            "experiment_group": "GROUP1",
            "lfc_norm": 1.0,
            "pval": 0.01,
        },
        {
            "dataset_name": "Dataset2",
            "technology": "TECH2",
            "experiment_group": "GROUP2",
            "lfc_norm": 2.0,
            "pval": 0.02,
        },
        {
            "dataset_name": "Dataset3",
            "technology": "TECH3",
            "experiment_group": "GROUP3",
            "lfc_norm": 3.0,
            "pval": 0.03,
        },
    ]
    expected_result = (
        "  Dataset1 - Technology TECH1; Tissue GROUP1; LFC 1.0; P-value 0.01\n"
        "  Dataset2 - Technology TECH2; Tissue GROUP2; LFC 2.0; P-value 0.02\n"
        "  Dataset3 - Technology TECH3; Tissue GROUP3; LFC 3.0; P-value 0.03"
    )

    def test__format_diff_exp_table_to_column__default__expected_result(self):
        result = ToolInputOutputFormatter.format_diff_exp_table_to_column(self.input_data)
        self.assertEqual(result, self.expected_result)

    def test__format_diff_exp_table_to_column__with_truncation__datasets_to_show_3__expected_result(self):
        input_data = self.input_data + [
            {
                "dataset_name": "Dataset4",
                "technology": "TECH4",
                "experiment_group": "GROUP4",
                "lfc_norm": 4.0,
                "pval": 0.04,
            }
        ]
        result = ToolInputOutputFormatter.format_diff_exp_table_to_column(input_data, datasets_to_show=3)
        self.assertEqual(
            result,
            self.expected_result + "\n  ... and 1 more datasets",
        )

    def test__format_diff_exp_table_to_column__with_missing_keys__expected_result(self):
        input_data = [
            {
                "dataset_name": "Dataset2",
                "technology": "TECH2",
                "experiment_group": "GROUP2",
                "lfc_norm": 2.0,
            },
            {
                "technology": "TECH3",
                "experiment_group": "GROUP3",
                "pval": 0.03,
            },
            {
                "dataset_name": "Dataset4",
            },
        ]
        result = ToolInputOutputFormatter.format_diff_exp_table_to_column(input_data)
        self.assertEqual(
            result,
            (
                "  Dataset2 - Technology TECH2; Tissue GROUP2; LFC 2.0; P-value 0\n"
                "  Unknown dataset - Technology TECH3; Tissue GROUP3; LFC 0; P-value 0.03\n"
                "  Dataset4 - Technology unknown; Tissue unknown; LFC 0; P-value 0"
            ),
        )


class TestFormatRowsToTableToColumn(TestCase):
    def test__format_rows_to_table__with_input_data__expected_result(self):
        input_data = [
            {"name": "Vasya", "age": 20, "city": "Moscow"},
            {"name": "Petya", "age": 25},
        ]
        result = ToolInputOutputFormatter.format_rows_to_table(input_data)
        self.assertEqual(result, "Name: Vasya; Age: 20; City: Moscow;\nName: Petya; Age: 25;")


class TestFormatListToEnumeratedColumn(TestCase):
    input_data = ["item1", "item2", "Item3", "Item4", "Item5"]
    expected_result = "1. Item1\n2. Item2\n3. Item3\n4. Item4\n5. Item5"

    def test__format_list_to_enumarated_column__default__expected_result(self):
        result = ToolInputOutputFormatter.format_list_to_enumarated_column(self.input_data)
        self.assertEqual(result, self.expected_result)

    def test__format_list_to_enumarated_column__with_truncation__rows_to_show_3__expected_result(self):
        result = ToolInputOutputFormatter.format_list_to_enumarated_column(self.input_data, rows_to_show=3)
        self.assertEqual(
            result,
            ("1. Item1\n2. Item2\n3. Item3\n  ... and 2 more rows"),
        )


class TestCreateToolLevelRecord(TestCase):
    def test__create_tool_level_record__default__expected_result(self):
        result = create_tool_level_record("tool_title", "message", "result")
        expected_result = {
            "hashid": hash_md5("tool_titlemessage"),
            "agent_title": "tool_title",
            "message": "message",
            "status": ToolStatus.COMPLETED,
            "result": "result",
        }
        self.assertEqual(result, expected_result)

    def test__create_tool_level_record__with_hashid__expected_result(self):
        result = create_tool_level_record("tool_title", "message", "result", hashid="hashid")
        expected_result = {
            "hashid": "hashid",
            "agent_title": "tool_title",
            "message": "message",
            "status": ToolStatus.COMPLETED,
            "result": "result",
        }
        self.assertEqual(result, expected_result)

    def test__create_tool_level_record__with_result_is_none__expected_result(self):
        result = create_tool_level_record("tool_title", "message", None)
        expected_result = {
            "hashid": hash_md5("tool_titlemessage"),
            "agent_title": "tool_title",
            "message": "message",
            "status": ToolStatus.COMPLETED,
            "result": None,
        }
        self.assertEqual(result, expected_result)

    def test__create_tool_level_record__with_result_is_not_str__expected_result(self):
        result = create_tool_level_record("tool_title", "message", {"key": "value"})
        expected_result = {
            "hashid": hash_md5("tool_titlemessage"),
            "agent_title": "tool_title",
            "message": "message",
            "status": ToolStatus.COMPLETED,
            "result": str({"key": "value"}),
        }
        self.assertEqual(result, expected_result)


class TestFormatListDiffExpTableToColumn(TestCase):
    def test__format_list_diff_expression__default__expected_result(self):
        input_data = [
            {
                "transcriptomic": {
                    "gene_symbol": "GENE1",
                    "combined_lfc_norm": 1.0,
                    "combined_pval": 0.01,
                },
                "methylation": {
                    "gene_symbol": "GENE1",
                    "combined_lfc_norm": 1.1,
                    "combined_pval": 0.011,
                },
            },
            {
                "transcriptomic": {
                    "gene_symbol": "GENE2",
                    "combined_lfc_norm": 2.0,
                    "combined_pval": 0.02,
                },
                "methylation": {},
            },
            {
                "transcriptomic": {},
                "methylation": {
                    "gene_symbol": "GENE3",
                    "combined_lfc_norm": 3.0,
                    "combined_pval": 0.03,
                },
            },
        ]

        expected_result = (
            "1. Gene: GENE1\n Transcriptomic:\n - CombinedLFC: 1.0 P-value: 0.01\n"
            " Methylation:\n - CombinedLFC: 1.1 P-value: 0.011\n"
            "2. Gene: GENE2\n Transcriptomic:\n - CombinedLFC: 2.0 P-value: 0.02\n"
            "3. Gene: GENE3\n Methylation:\n - CombinedLFC: 3.0 P-value: 0.03"
        )

        result = ToolInputOutputFormatter().format_list_diff_expression(input_data)
        self.assertEqual(result, expected_result)


class TestFormatGenesInDisease(TestCase):
    def test__format_genes_in_disease__multiple_genes__expected_result(self):
        input_data = {
            "gene_names": ["GENE1", "GENE2", "GENE3"],
            "disease_name": "disease_name",
        }
        expected_result = "GENE1, GENE2 and GENE3 in Disease_name"
        result = ToolInputOutputFormatter().format_genes_in_disease(input_data)
        self.assertEqual(result, expected_result)

    def test__format_genes_in_disease__one_gene__expected_result(self):
        input_data = {
            "gene_names": [
                "GENE1",
            ],
            "disease_name": "disease_name",
        }
        expected_result = "GENE1 in Disease_name"
        result = ToolInputOutputFormatter().format_genes_in_disease(input_data)
        self.assertEqual(result, expected_result)
