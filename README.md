# ClickUp to Linear Documents Migration

## ClickUp Hierarchy Representation

```
📂 Workspace
│    - 📄 Document
   🗂 Everything
   │    - 📄 Document
   🗂 Space (Multiple)
   │    - 📁 Folder (Multiple)
   │    │    - 📄 Document
   │    │    - 📁 Sub-Folder (Recursive)
   │    │    │      - 📄 Document
   │    │    - 📜 List
   │    │    │      - Task
   │    │    │      - 📄 Document
   │    │      - 📄 Document
   │    - 📄 Document
   │    - 📜 List (Multiple)
   │    │      - Task
   │    │      - 📜 Sub-List (Recursive)
   │    │      │      - Task
   │    │      │      - 📄 Document
   │    │      - 📄 Document
```

## ClickUp Document Fetching Flow

### 1. Initialize API Key & Workspace ID
- Retrieve and store the `API_TOKEN` from ClickUp settings.
- Retrieve the `WORKSPACE_ID` (SuperOps ID).

### 2. Retrieve All Spaces in the Workspace
- Call `getSpaces(Workspace_Id)`.
- Store `spaceIds[]` for all spaces.

### 3. Retrieve Documents Under Each Space
#### 3.1 Retrieve Documents from Folders in a Space
- Call `getFolders(spaceId)`. Store `folderIds[]`.
- For each folder and sub-folder:
  - Fetch documents from `{space/folder/docs}`.
  - Recursively retrieve documents from all child lists and sub-folders.
- Retrieve lists using `getLists(Folder_Id)`.
  - Fetch documents from `{space/folder/lists/docs}`.

#### 3.2 Retrieve Documents from Lists in a Space
- Call `getFolderlessLists(spaceId)`. Store `listIds[]`.
- Fetch documents from `{space/list/docs}`.
- Recursively retrieve documents from all child lists.

#### 3.3 Retrieve Documents Directly from a Space
- Fetch documents from `{space/docs}`.

#### 3.4 Retrieve Documents of Tasks from a Space
- Retrieve task-related documents using `getTasks(List_Id)`.
- Fetch documents from `{space/folder/list/task/docs}`.

### 4. Search and Fetch Documents
- Use `searchDocs(WORKSPACE_ID, parentId, parentValue)` to retrieve `docIds`.
- Use `getDocPages(docId)` to get document content in JSON.

### 5. Retrieve Documents from Everything
- Use `searchDocs(Everything_value = 7)` to fetch all `docIds`.

### 6. Retrieve Documents from the Workspace
- Use `searchDocs(WORKSPACE_ID, workspace_value = 12)` to fetch all `docIds`.

### 7. Save Results Locally
- Store the retrieved ClickUp documents in `clickup_docs.json`.

## Linear Document Creation Flow

### Linear’s Structure (Compared to ClickUp)
```
📂 Workspace
|- 🏢 Teams (Map Spaces from ClickUp)
|  |- 📌 Projects (Docs of Space as Project)
|  |       - Resources
|  |  |- 📄 Docs
```

### Prerequisites
1. Install Node.js and npm.
2. Install the Linear Client SDK.
3. Import the Linear Client and set the API key.
4. Create a new project in Linear.
5. Retrieve the project ID for creating documents.

### Steps to Create Documents in Linear
#### 1️⃣ Load ClickUp Documents
- Read `clickup_docs.json` and extract document details.

#### 2️⃣ Create Documents in Linear
- Use `createDocument(title, project_Id, content)` to create documents.
- Maintain a mapping between ClickUp and Linear documents.

#### 3️⃣ Fetch Document Content from Linear
- Use `getDocument(DocId)` to check ClickUp attachments.

#### 4️⃣ Replace ClickUp Attachments
- Replace ClickUp references using `updateDocument(DocId, content)`.
- Download and upload attachments.

#### 5️⃣ Save Processed Documents
- Maintain a mapping of ClickUp → Linear documents in `saved_documents.json`.

## Migration Considerations
### Needs
- **Mapping:** Space (ClickUp) → Teams (Linear)
- **Handling workspace documents:** Organizing documents from non-technical spaces (Finance, Sales, Marketing)
- **Task-related documents (63 identified):** Location in Linear?

### Disadvantages of Linear
- No dedicated document section.
- No nested document hierarchy.
- No preview or embedding support for attached files.

### Measures
- Use project views for documents.
- List existing hierarchies in document descriptions.
- Future documents should be manually linked using `/Filename` in descriptions.

