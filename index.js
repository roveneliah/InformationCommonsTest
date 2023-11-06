const OpenAI = require("openai");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const core = require("@actions/core");
const github = require("@actions/github");

console.log("hello world");

console.log(process.env.YO);

const openai = new OpenAI({
  apiKey: process.env.OPENAI,
});

async function checkContentWithLanguageModel(content, prompt) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are responsible for vetting files given a prompt.",
        },
        { role: "system", content: `PROMPT: ${prompt}` },
        { role: "user", content },
      ],
      model: "gpt-3.5-turbo",
    });
    console.log(completion.choices[0].message.content);

    return completion.choices[0].message.content;
  } catch (error) {
    core.setFailed(error.message);
    return `Failed to check content: ${error.message}`;
  }
}

// Recursive function to read all files in a directory and its subdirectories
async function processInfoMdFiles(dirPath, fn) {
  // Read all items in the directory
  core.setOutput("testOp", 22);

  const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

  let messages = [];
  dirents.forEach(async (dirent) => {
    const fullPath = path.join(dirPath, dirent.name);

    if (dirent.isDirectory()) {
      processInfoMdFiles(fullPath, fn);
    } else if (dirent.isFile() && dirent.name.endsWith(".info.md")) {
      // If the item is a file and ends with .info.md, read and process it
      const content = fs.readFileSync(fullPath, "utf8");
      console.log("Dipatching check on", dirent.name);

      const result = await fn(content);
      const output = `File: ${fullPath}\n${result}`;
      messages.push(output);
    }
  });

  core.setOutput("messages", messages.join("\n"));
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
}
// core.getInput("prompt") ||
const prompt =
  "The following file content is meant as journalistic fact, and should be as concise as possible, with no insinuations or inuendo.  It should also have at least two sources.  Respond with a list of failing conditions.";

processInfoMdFiles(".", async (content) =>
  checkContentWithLanguageModel(content, prompt)
);
