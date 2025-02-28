CLICKUP – LINEAR DOCUMENTS MIGRATION


ClickUp Hierarchy Representation

📂 Workspace 
│   	- 📄 Document
   🗂 Everything
   │   	- 📄 Document
   🗂 Space (Multiple) 
   │   	-📁  Folder (Multiple)
   │   	│   	- 📄 Document
   │   	│   	- 📁  Sub-Folder (Recursive)
   │   	│   	│      - 📄 Document
   │   	│   	- 📜 List
   │   	│   	│      - Task
   │   	│   	│      - 📄 Document
   │  	 - 📜 List (Multiple)
   │   	│   	│      - Task
   │   	│       - 📜 Sub-List (Recursive)
    |       |    	│   	│      - Task
   │   	│   	│      - 📄 Document
   │   	│      - 📄 Document
   │   	- 📄 Document


ClickUp Document Fetching Flow


1. Initialize API Key & Workspace ID
Retrieve and store the API_TOKEN (Settings → Apps → Generate Token → Copy it).
Retrieve the WORKSPACE_ID (SuperOps ID).

2. Retrieve All Spaces in the Workspace
Call getSpaces(Workspace_Id).
Store spaceIds[] for all spaces in the workspace.
3. Retrieve Documents Under Each Space


3.1 Retrieve Documents from Folders in a Space
Call Getfolders(spaceId).
Store folderIds[].
For Each Folder Docs:


Fetch documents from {space/folder/docs}.
For Each Sub-Folder:
Retrieve sub-folders within the folder.
Fetch documents from {space/folder/sub-folder/docs}.
Recursively retrieve documents from all child lists until none remain.
For Each Sub-List:
Retrieve lists within the folder by getLists(Folder_Id) and store ListIds[ ].
Fetch documents from {space/folder/lists/docs}.
Recursively retrieve documents from all child folders until none remain.

3.2 Retrieve Documents from Lists in a Space
Call GetFolderlessLists(spaceId).
Store listIds[].
For Each List Docs:


Fetch documents from {space/list/docs}.
For Each Sub-List:
Retrieve nested lists within the list.
Fetch documents from {space/list/sub-list/docs}.
Recursively retrieve documents from all child lists until none remain.

3.3 Retrieve Documents Directly from a Space
Fetch documents from {space/docs}.

3.4 Retrieve Documents of Tasks from a Space
[Design junkies -1 Product msp – 58 onboarding – 3 Quick wins -1
 Total Task Documents= 63]
Call Getfolders(spaceId).
Store folderIds[].
For Each Sub-List:


Retrieve lists within the folder by getLists(Folder_Id) and store listIds[ ].
Retrieve tasks withing each list by getTasks(List_Id) and store taskIds[ ].
Fetch documents from {space/folder/list/task/docs}.
Recursively retrieve documents from all child folders until none remain.
Call GetFolderlessLists(spaceId).
Store listIds[].
For Each List:


Retrieve tasks withing each list by getTasks(List_Id) and store tassIds[ ].
Fetch documents from {space/list/task/docs}.
Recursively retrieve documents from all child lists until none remain.

4. Search and Fetch Documents
Use searchDocs(WORKSPACE_ID, parentId, parentValue) to retrieve docIds.
parentId can be a Space_ID, Folder_ID, List_ID, Task_ID.
parentValue options:
Space = 4
Folder = 5
List = 6
Task = 1
Use getDocPages(docId) to retrieve the document name and content etc.. in json

5. Retrieve Documents from the Everything
Use searchDocs(Everything_value = 7) to fetch all docIds from the Everything.
Use getDocPages(docId) to retrieve the name and content of each document.

6. Retrieve Documents from the Workspace
Use searchDocs(WORKSPACE_ID, workspace_value = 12) to fetch all docIds from the workspace without any location.
Use getDocPages(docId) to retrieve the name and content of each document.
7. Save Results in Local Machine
Store the retrieved data from clickup .json.

Linear Document creating Flow


Linear’s Structure (Compared to ClickUp)

📂 Workspace
|- 🏢 Teams (Map Spaces from ClickUp)
|	|- 📌 Projects (Docs of Space as Project)
|	|       - Resources
|	|	|-📄 Docs


Requirements before creating a Document


1️⃣ Install Node.js and npm.
2️⃣ Install the Linear Client SDK.
https://docs.google.com/document/d/11XlkQtJJpzvbXkul1fFXubHXhCUmm4cWv_y5R2XKklQ/edit?tab=t.0#heading=h.b07cuffjgem1 
3️⃣ Import the Linear Client and set the API key (Linear → Settings → Security and Access → Create Personal API Keys).
4️⃣Create a new project in Linear.
5️⃣ Get the project ID for creating documents in Resources of that Project.


Steps to Create Documents in Linear
1️⃣ Load ClickUp Documents
Read document data from clickup_docs.json (which contains ClickUp documents).
Extract necessary details (e.g., title, content, etc.).
2️⃣ Create Documents in Linear createDocument(title,project_Id,content)
Create a new document in Linear inside the Resources section of the created project.
Maintain a mapping between ClickUp and Linear documents for reference:
Store ID, Title, and URL of the Linear document.
Store the ID of the corresponding ClickUp document.
Before creating a document, check the reference mapping to avoid duplicate creation.
3️⃣ Fetch Document content from Linear to check ClickUp attachments after creation
Retrieve newly created documents from Linear by getDocument(DocId).
Extract document content to check for any ClickUp links.
4️⃣ Replace ClickUp attachment with Linear’s using updateDocument(DocId, content)
Replace the reference files in the document content with getDocument(ReferedDocId)
Download attachments from ClickUp and store them locally.
Use uploadFile(/local/path) to upload the files where needed.
5️⃣ Save Processed Documents
Maintain a mapping of ClickUp → Linear documents.
Store the mapping in a JSON file (saved_documents.json) that records the ID and URL of the Linear documents for internal reference.



Needs:
Space(clickup) → Teams(linear) mapping
Handling workspace documents (except Engineering) and everything Docs as Project CommonDocuments? But Under __ teams?
Engineering(in Workspace) as Project Engineering? Teams(___)?
Managing documents from non-technical spaces (Finance, Sales, Marketing) as Teams not in Linear
Spaces of a Team as a Single project for Document or separate Project?
Ex: IT Space, IT Roadmap in ClickUp but  Team Product-IT in Linear..
for task-related documents (63 identified). Location in linear?

Disadvantages:
No Dedicated Document Section → Makes search & discoverability harder.
No Nested Structure → Documents Don’t Support Hierarchies
No preview available and no embedding support for attached or uploaded files.

Measures:
View or Project’s View for Documents (using the prefix "Docs" or selecting a specific projects in the view filter).
Existing hierarchies, as in ClickUp, can be listed in the Description, making document navigation and search easier.
Note: Future documents will need to be added manually by /Filename in description.
