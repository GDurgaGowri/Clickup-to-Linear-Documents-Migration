import { LinearClient } from "@linear/sdk";
import fs from "fs/promises"; // Use promises-based fs

const linearClient = new LinearClient({
    apiKey: "",
});


const savedDocumentsPath = "/home/dg/Downloads/Linear/All Docs Details.json";
var i = 0;

async function retryWithBackoff(fn, retries = 20, baseDelay = 500, maxDelay = 3000) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await fn();
        } catch (error) {
            if (error.response?.status === 429) {
                let retryAfter = error.response.headers["retry-after"] 
                    ? parseInt(error.response.headers["retry-after"]) * 1000  // Convert to milliseconds  
                    : 3600;
                if(attempt == 20)
                        retryAfter = 3600;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                console.warn(`Error`);
                retryAfter = 3600;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            }
        }
        attempt++;
        if(attempt == retries)
            attempt = 0;
    }
    throw new Error("Max retries reached. Request failed.");
}

async function processDocuments() {
    try {
        // Read JSON file
        const data = await fs.readFile(savedDocumentsPath, 'utf8');
        const savedJSON = JSON.parse(data);

        for (const doc of savedJSON) {
            // Fetch document from Linear
            const getDoc = await retryWithBackoff(()=> linearClient.document(doc.LinearDocId));
            let docContent = getDoc.content;
            if(!getDoc)
                continue;
            // Regular expression to find ClickUp links
            const pattern = /https:\/\/app\.clickup\.com\/[^\s)]+/g;
            const matches = docContent.match(pattern);
            // console.log("yes doc")

            if (!matches) continue;

            // console.log("yes")
            let updatedDocContent = docContent;

            for (let match of matches) {
                const docpattern = /13mmuy-\d+\/13mmuy-\d+/g;
                const matchedDocId = match.match(docpattern); // Extract ID

                if (matchedDocId) {
                    const matchedIdString = matchedDocId[0]; // Convert to string
console.log(matchedDocId+" "+getDoc.url+"\n")
                    // Find the corresponding linked document
                    const linkedDoc = savedJSON.find(d => d.ClickupDocId === matchedIdString);

                    if (linkedDoc) {
                        const childDoc = await retryWithBackoff(()=> linearClient.document(linkedDoc.LinearDocId));

                        // Replace ClickUp link with formatted content
                        docContent = docContent.replace(
                            match,
                            childDoc.url
                        );
                         // console.log(`${i} Updated: ${match} -> ${childDoc.url}`);
                        
                    }
                } else {
                    console.log("no");
                }
            }

            if (updatedDocContent !== docContent) {
                await retryWithBackoff(()=> linearClient.updateDocument(getDoc.id, { content: docContent }));
                i++;
                console.log(`${i} Updated: ${getDoc.id} -> ${getDoc.url}`);
                
            }
        }
    } catch (err) {
        console.error("Error processing documents:", err);
    }
}

// Call the function
processDocuments();
