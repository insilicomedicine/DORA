# DORA Template Configuration

The DORA template configuration file (`.json`) defines the structure, behavior, and content generation logic of a document template. It is essential for guiding the DORA kernel through document creation, including user inputs, section structure, interdependencies, and tool integrations.

## 💡 Configuration Highlights

- **Modularity** – Each section is independently controlled with specific prompts and logic.
- **Tool Integration** – Tools such as literature search and omics analysis enhance scientific quality.
- **Consistency** – Shared memory enforces narrative coherence across sections.
- **Instruction Precision** – Prompts ensure academic tone, structure, and non-redundant output.


## 📚 Glossary

| **Term** | **Definition** |
| --- | --- |
| `slug` | A unique, machine-readable identifier for each section or input |
| `prompt` | Instructional text given to the AI model to guide content generation |
| `shared_memory` | Mechanism that allows one section to recall content from others implicitly |
| `depends_on` | Explicit dependency on other section outputs via placeholder references |
| `tool` | External AI agent (e.g., PubMed search) used for data augmentation |
| `plan_prompt` | Prompt to create an outline/structure before full text generation |
| `placeholder` | A marker within prompts replaced with user input, tool data, or other content at runtime |

## 🔑 Mandatory Top-Level Keys

| **Field** | **Description** | **Data Type** |
| --- | --- | --- |
| `template_type` | High-level category for grouping templates in the UI. Must match predefined values such as Original research, Business report, Literature review, etc. | string |
| `template_description` | Brief explanation of the purpose and content of the template. | string |
| `sections` | Defines the structure of the document using unique slugs as keys. Each value configures a section’s prompt, tools, and rules. | object (dictionary) |
| `user_inputs` | Input fields the user must complete before document generation. Referenced in section prompts via \[placeholder\]. | array of objects |
| `shared_memory` | Describes memory flow between sections to ensure consistent context. | object (dictionary) |


## 📝 User Input Object

These define the fields users complete prior to generation. They appear in the DORA interface under **Document Settings**.

| **Key** | **Type** | **Description** |
| --- | --- | --- |
| `slug` | string | Machine-readable ID for the field (e.g., topic) |
| `type` | string | Input type. Currently supports "free_text_input" |
| `text_limit` | integer | Maximum allowed characters |
| `display_name` | string | User-facing label for the input field |
| `display_size` | string | Field size in UI (e.g., "large", "small") |
| `default_value` | string | Pre-filled value for user guidance |

_Screenshot to be added_

## 🧩 Section Object

Each section of the document is represented as an object in the `sections` dictionary.

| **Key** | **Type** | **Description** |
| --- | --- | --- |
| `slug` | string | Unique ID (e.g., main_text) |
| `title` | string | Title shown to the user |
| `prompt` | string | Main instruction for text generation (uses placeholders) |
| `expected_output_instructions` | string | Format and tone guidance for the output |
| `is_title` | boolean | If true, marks this as the document title |
| `tools` | array | List of tool slugs available for this section |
| `depends_on` | array | List of section slugs this section depends on |
| `plan_prompt` | string | Prompt to create an outline/plan (if needed) |
| `requires_plan` | boolean | If true, section generation starts with a plan |
| `dynamic_template_subsection` | boolean | Whether the section supports dynamic subsections |
| `display_on_plan_overview` | boolean | Controls whether the section is shown in the research plan UI |
| `display_name_on_plan_overview` | string or null | Optional custom display name in plan view |
| `custom_parts` | (empty) | Reserved for injected interface values |
| `sub_sections` | array (unused) | Reserved for future use |


## 🧱 Sections Overview

Below are examples of common section configurations. You can explore the configuration example on the admin page.

### **1. Title**

| **Property** | **Value** |
| --- | --- |
| `slug` | `title` |
| `prompt` | Generates a single-line title |
| `expected_output_instructions` | "One single-line title." |
| `is_title` | `true` |
| `tools` | None |

### **2. Abstract**

| **Property** | **Value** |
| --- | --- |
| `slug` | `abstract` |
| `prompt` | Summarizes key points and significance |
| `expected_output_instructions` | 150–250 word paragraph, no references |
| `tools` | None |

### **3. Introduction**

| **Property** | **Value** |
| --- | --- |
| `tools` | `pubmed_abstract_similarity_search_tool`, `web_search_tool` |
| `prompt` | Explains the topic, narrowing focus and setting context |
| `expected_output_instructions` | 300–400 words; no repetitive phrasing |

### **4. Main Text**

| **Property** | **Value** |
| --- | --- |
| `requires_plan` | `true` |
| `dynamic_template_subsection` | `true` |
| `tools` | All scientific tools enabled |
| `plan_prompt` | Outputs a 2-3 section structured outline |
| `prompt` | Executes the plan with depth and clarity |
| `expected_output_instructions` | ~7000 words; one cohesive narrative, no duplication |

### **5. Conclusion**

| **Property** | **Value** |
| --- | --- |
| `tools` | Literature tools |
| `prompt` | Summarizes insights and future directions |
| `expected_output_instructions` | 150–200 words; single paragraph, no repeated ideas |

## 🧠 Shared Memory and Dependencies

### 1. Shared Memory

Defined in the `shared_memory` object:

```
{
    "title": [
        "main_text"
    ],
    "abstract": [
        "main_text"
    ],
    "main_text": [],
    "conclusion": [
        "main_text"
    ],
    "introduction": [
        "conclusion"
    ]
}
```

- Enables automatic context transfer between sections.
- Improves narrative flow and avoids content duplication.
- **Memory is unidirectional**.

### 2. Depends On

Used for deterministic content reuse from another section. Example:

`"depends_on": ["Network analysis"]`

Prompt must include a placeholder like:

`[Network analysis.results]`

This will inject the entire generated output from that section.

### 3. Comparison: Shared Memory vs Depends On

| **Aspect** | **Shared Memory** | **Depends On** |
| --- | --- | --- |
| Purpose | Recall context | Insert section output verbatim |
| Location in Config | Top-level key | Inside section object |
| Placeholder Required | ❌ No | ✅ Yes (\[SectionSlug.results\]) |
| Best For | Summaries, intros, conclusions | Analytical reuse, citations, methods |
| Output Control | Implicit | Explicit |
| Prevents Duplication | ✅ Yes | ❌ Only if placeholders are used correctly |

## 🔧 Tool Selection and Prompt Design

DORA dynamically integrates scientific tools into the generation process.

### **Prompt Placeholders**

Each prompt that supports tools should include:

- `{activated_tools|<group>|names}` – Inserted list of active tool names
- `{activated_tools|<group>|instructions}` – Combined instructions from active tools

### **Example**

**Prompt before substitution:**

```
Use {activated_tools|scientific_search_tools|names} when needed.

{activated_tools|scientific_search_tools|instructions}
```

**After substitution (tools enabled):**

```
Use pubmed_abstract_similarity_search_tool and web_search_tool when needed.

Instructions for pubmed_abstract_similarity_search_tool: ...

Instructions for web_search_tool: ...
```

### **Admin Tool Configuration**

Tool metadata is stored in:

`/admin/kernel/toolpromptinstructiongroup/`

Example:

```
{
    "name": "scientific_search_tools",
    "tools": [
        {
            "name": "pubmed_abstract_similarity_search_tool",
            "instruction": "..."
        },
        {
            "name": "web_search_tool",
            "instruction": "..."
        }
    ]
}
```

### **Validation Rules**

- `{...|names}` and `{...|instructions}` must appear together
- Tools listed must exist and include valid instructions
- At least one tool from the group must be selected if placeholders are used


## 📥 How to Load a Custom Template to Admin Page

_[List of screenshots from OS version]_

## Validation Rules

1. **Slugs** must be unique across user inputs and sections.
2. **Only one** section can be displayed on the plan overview.
3. **Only one** section can be marked as a title.
4. **All dependencies** (`depends_on`) must reference existing slugs.
5. **Shared memory** and dependency maps are merged and checked for conflicts.
6. **Tool placeholders** must be paired and backed by actual tools in the section.
7. **Prompt placeholders** must:
   - Match valid user inputs or section dependencies.
   - Avoid referencing keys not declared in `depends_on`.

## Assign Tools and Instructions [todo]

- Navigate to **Tool Prompt Instruction Group**
- Define instruction templates for AI tool integration
- These will be inserted dynamically into prompts during generation
