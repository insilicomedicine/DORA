/* eslint-disable no-magic-numbers */
export const reviewInsightsMockData = {
  predefined_review: {
    overall_impression: {
      title: 'Overall Score',
      score: 8,
      score_explanation:
        'The article presents a comprehensive analysis of QPCTL as a therapeutic target across multiple diseases, supported by a robust review of scientific literature. Its strengths lie in the clarity of information and well-structured sections, although it could benefit from a more detailed discussion on the limitations of current research and potential side effects of QPCTL inhibitors.'
    },
    categories: [
      {
        id: 'language_and_style',
        title: 'Language',
        score: 7,
        score_explanation:
          'The article demonstrates a good level of linguistic accuracy and appropriate style for a scientific audience, but it contains some grammatical inconsistencies and could benefit from improved sentence structure and clarity in certain sections.',
        strengths:
          'The article presents complex scientific concepts clearly and accurately, employing appropriate terminology for the intended audience. The references are well-integrated, supporting the claims made throughout the text. The tone remains consistent and formal, which is suitable for a scientific article.',
        code_based_metrics: {
          total_word_count: 1364,
          reading_time_minutes: 5.7,
          total_character_count: 11033,
          section_word_character_counts: {
            Results: [6444, 827],
            Conclusion: [1608, 215],
            Introduction: [2941, 319]
          }
        },
        suggestions: [
          {
            text: "There are some instances of repetitive phrasing, particularly in the 'Introduction' section where 'QPCTL' is mentioned multiple times in close succession. Consider rephrasing to reduce redundancy, such as using pronouns or synonyms after the initial introduction.",
            seriousness: 'medium'
          },
          {
            text: "In the 'Results' section, the phrase 'QPCTL, or glutaminyl-peptide cyclotransferase-like protein, is an enzyme' is repeated. Instead, introduce QPCTL once and refer to it as 'the enzyme' in subsequent mentions to enhance readability.",
            seriousness: 'medium'
          },
          {
            text: "The sentence structure in several parts is complex and may hinder readability, particularly in the 'Alzheimer's Disease' section. For example, 'The enzyme catalyzes the formation of pyroglutamate-modified amyloid-β peptides...' could be simplified to improve clarity: 'QPCTL catalyzes the formation of amyloid-β peptides that are modified by pyroglutamate, which aggregate and form plaques in AD patients.'",
            seriousness: 'high'
          },
          {
            text: "In the 'Conclusion', consider summarizing the key findings more succinctly to reinforce the main points. For instance, the sentence 'The analysis of QPCTL as a therapeutic target has revealed its substantial involvement in various diseases...' could be streamlined to focus on the most impactful results.",
            seriousness: 'medium'
          },
          {
            text: "Some abbreviations, like 'AD' for Alzheimer's Disease, should be defined upon first use in the 'Introduction' for clarity, especially for readers who may not be familiar with the terminology.",
            seriousness: 'low'
          }
        ]
      },
      {
        id: 'content_and_relevance',
        title: 'Content',
        score: 8,
        score_explanation:
          "The article provides a comprehensive overview of QPCTL's role in various diseases, supported by relevant literature. However, it could benefit from clearer organization and more depth in certain sections.",
        strengths:
          "The article demonstrates strong accuracy and depth of information regarding QPCTL's involvement in multiple diseases, with appropriate citations to current research. It effectively engages the target audience of researchers and clinicians interested in cancer and metabolic diseases.",
        code_based_metrics: null,
        suggestions: [
          {
            text: "The introduction could be more concise by removing repetitive phrases like 'QPCTL, or glutaminyl-peptide cyclotransferase-like protein,' which appears multiple times. Consider using 'QPCTL' after the first mention.",
            seriousness: 'medium'
          },
          {
            text: "In the Results section, the analysis of QPCTL in cancer states, 'the role of QPCTL in modulating the immune response and promoting tumor growth makes it a promising target for cancer therapy,' but lacks specific examples or data to support this claim. Include data or references that illustrate how QPCTL modulation affects cancer therapy outcomes.",
            seriousness: 'high'
          },
          {
            text: "In the Alzheimer's Disease section, the sentence 'QPCTL has been identified as a significant player in the pathogenesis of Alzheimer's disease' could be strengthened by providing specific studies or data demonstrating this involvement. Adding a citation or a brief summary of key findings would enhance credibility.",
            seriousness: 'medium'
          },
          {
            text: 'The conclusion could benefit from a more detailed summary of the implications of QPCTL inhibition across the diseases discussed. Consider adding a few sentences that clearly outline potential therapeutic strategies or future research directions.',
            seriousness: 'medium'
          },
          {
            text: "In the Clinical status of drug candidates for QPCTL targeting section, the mention of 'monoclonal antibodies targeting QPCTL' could be expanded to include current clinical trial phases or results, providing more context for the audience.",
            seriousness: 'medium'
          },
          {
            text: "The article lacks a clear visual summary or diagram that illustrates QPCTL's role in the diseases mentioned. Adding a flowchart or infographic could enhance engagement and understanding for visual learners.",
            seriousness: 'low'
          }
        ]
      },
      {
        id: 'readability_and_structure',
        title: 'Readability',
        score: 7,
        score_explanation:
          'The article is generally well-organized and coherent, with a logical flow of information. However, some sections could benefit from clearer transitions and more concise paragraph structures to enhance overall readability.',
        strengths:
          "The article effectively utilizes headings and subheadings to guide the reader through the various sections, maintaining a clear structure. Each section provides relevant information that contributes to the overall understanding of QPCTL's role in various diseases.",
        code_based_metrics: {
          flesch_kincaid_grade: 14.3
        },
        suggestions: [
          {
            text: "In the 'Introduction' section, consider breaking down longer sentences (e.g., 'QPCTL, or glutaminyl-peptide cyclotransferase-like protein, catalyzes the formation of pyroglutamate residues...') into shorter ones for better clarity. This will enhance readability.",
            seriousness: 'medium'
          },
          {
            text: "In the 'Results' section, the transition between subsections (e.g., 'Alzheimer's Disease' to 'Cancer') could be improved. Adding a brief sentence summarizing the previous section's findings before introducing the next could enhance flow.",
            seriousness: 'medium'
          },
          {
            text: "In the 'Cancer' subsection, the phrase 'Despite this, the role of QPCTL in modulating the immune response...' could be rephrased for conciseness. Consider simplifying to 'Nonetheless, QPCTL's role in immune modulation makes it a promising target for therapy.'",
            seriousness: 'low'
          },
          {
            text: "In the 'Clinical status of drug candidates for QPCTL targeting' section, consider using bullet points for the list of drug candidates and their effects. This would improve clarity and make the information more digestible.",
            seriousness: 'medium'
          },
          {
            text: "In the 'Conclusion,' the summary could be more concise. Consider reducing redundancy by summarizing the main points about QPCTL's implications in fewer sentences, focusing on the most critical aspects.",
            seriousness: 'medium'
          }
        ]
      },
      {
        id: 'argumentation_and_evidence',
        title: 'Argumentation',
        score: 7,
        score_explanation:
          'The article presents a well-structured argumentation with substantial evidence from recent studies; however, it lacks a broader discussion on counterarguments and alternative perspectives.',
        strengths:
          "The article effectively utilizes a variety of credible sources, primarily recent studies, to support its claims about QPCTL's role in various diseases. The clarity and coherence of the argumentation are strong, particularly in linking QPCTL inhibition to potential therapeutic benefits across multiple conditions.",
        code_based_metrics: {
          total_references: 20,
          unique_references: 9,
          publication_year_distribution: {
            2019: 1,
            2022: 3,
            2023: 4,
            2024: 1
          }
        },
        suggestions: [
          {
            text: "Expand the discussion on alternative perspectives regarding QPCTL targeting, particularly in the 'Introduction' section, to provide a more balanced view of the potential risks and limitations of targeting this enzyme.",
            seriousness: 'medium'
          },
          {
            text: "Include a more comprehensive review of older studies in the 'Results' section to contextualize findings and show the evolution of research on QPCTL, which would enhance the depth of the argumentation.",
            seriousness: 'medium'
          },
          {
            text: "In the 'Conclusion' section, explicitly mention any potential side effects or challenges associated with QPCTL inhibition to address concerns that may arise from readers regarding the safety of these treatments.",
            seriousness: 'high'
          },
          {
            text: "Clarify the significance of the statistical results presented in the differential expression analyses throughout the 'Results' section, as some readers may not grasp the implications of p-values and log fold changes without further explanation.",
            seriousness: 'medium'
          },
          {
            text: "In the 'Clinical status of drug candidates for QPCTL targeting' section, consider discussing any ongoing clinical trials or their preliminary results to provide a clearer picture of the current research landscape.",
            seriousness: 'medium'
          },
          {
            text: "Address the potential ethical considerations related to QPCTL inhibition in the 'Conclusion' section, particularly concerning its implications in cancer therapy, to enrich the discussion.",
            seriousness: 'medium'
          },
          {
            text: "Add a brief summary of the main findings and implications at the end of the 'Abstract' to enhance its effectiveness and give readers a clear takeaway from the article.",
            seriousness: 'low'
          }
        ]
      }
    ]
  }
};
