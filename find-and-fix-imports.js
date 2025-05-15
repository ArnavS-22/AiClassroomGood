const fs = require("fs")
const path = require("path")
const { promisify } = require("util")

const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const stat = promisify(fs.stat)

// Define the directory to start searching from
const rootDir = "."

// Define the patterns to search for
const patterns = [
  {
    search: /from ['"]@\/lib\/supabase['"]/g,
    replace: 'from "@/lib/supabase-browser"',
    clientOnly: true,
  },
  {
    search: /import.*from ['"]@\/lib\/supabase['"]/g,
    replace: (match) => {
      // Replace with browser or server import based on file path and content
      if (match.includes("createServerClient") || match.includes("getSupabaseServerClient")) {
        return match.replace('from "@/lib/supabase"', 'from "@/lib/supabase-server"')
      } else {
        return match.replace('from "@/lib/supabase"', 'from "@/lib/supabase-browser"')
      }
    },
    clientOnly: false,
  },
]

// Define file extensions to search
const extensions = [".ts", ".tsx", ".js", ".jsx"]

// Function to check if a file is a client component
function isClientComponent(content) {
  return content.includes('"use client"') || content.includes("'use client'")
}

// Function to recursively search directories
async function searchDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory() && !fullPath.includes("node_modules") && !fullPath.includes(".next")) {
      await searchDirectory(fullPath)
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      await checkFile(fullPath)
    }
  }
}

// Function to check and update a file
async function checkFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8")
    let updatedContent = content
    let hasChanges = false

    const isClient = isClientComponent(content)

    for (const pattern of patterns) {
      // Skip server-only replacements for client components
      if (isClient && pattern.clientOnly === false) continue

      if (pattern.search.test(content)) {
        console.log(`Found match in ${filePath}`)

        if (typeof pattern.replace === "function") {
          updatedContent = updatedContent.replace(pattern.search, pattern.replace)
        } else {
          updatedContent = updatedContent.replace(pattern.search, pattern.replace)
        }

        hasChanges = true
      }
    }

    if (hasChanges) {
      console.log(`Updating ${filePath}`)
      await writeFile(filePath, updatedContent, "utf8")
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error)
  }
}

// Start the search
searchDirectory(rootDir)
  .then(() => console.log("Search and replace completed"))
  .catch((error) => console.error("Error:", error))
