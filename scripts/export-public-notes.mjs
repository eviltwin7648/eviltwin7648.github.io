import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import siteConfig from "../public-notes-site.config.mjs"

const siteRoot = process.cwd()
const vaultRoot = path.resolve(process.env.PUBLIC_NOTES_VAULT_ROOT ?? siteConfig.vaultRoot)
const contentRoot = path.join(siteRoot, "content")
const notesRoot = path.join(contentRoot, "notes")

const excludedRootDirs = new Set([".git", ".obsidian", "node_modules", "public-notes-site"])

const assetExtensions = new Set([
  ".avif",
  ".bmp",
  ".csv",
  ".gif",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".svg",
  ".txt",
  ".wav",
  ".webm",
  ".webp",
])

async function main() {
  await assertVaultRoot(vaultRoot)
  console.log(`Using vault root: ${vaultRoot}`)

  const markdownFiles = await collectMarkdownFiles(vaultRoot)
  const publishedNotes = []
  const allFiles = []

  for (const relativePath of markdownFiles) {
    const absolutePath = path.join(vaultRoot, relativePath)
    const source = await fs.readFile(absolutePath, "utf8")
    const parsed = matter(source)
    allFiles.push(relativePath)

    if (!isPublished(parsed.data.publish)) {
      continue
    }

    publishedNotes.push({
      absolutePath,
      relativePath,
      parsed,
      title: resolveTitle(relativePath, parsed.data),
    })
  }

  const publishedByPath = new Set(publishedNotes.map((note) => normalizePath(note.relativePath)))
  const publishedByStem = buildStemIndex(publishedNotes.map((note) => note.relativePath))
  const allAssetCandidates = await collectAssetCandidates(vaultRoot)

  await fs.rm(notesRoot, { recursive: true, force: true })
  await fs.mkdir(notesRoot, { recursive: true })

  const copiedAssets = new Set()
  const warnings = []

  for (const note of publishedNotes) {
    const noteDir = path.dirname(note.relativePath)
    const assetReferences = new Set()
    const rewrittenContent = rewriteLinks(note.parsed.content, {
      noteDir,
      sourceRelativePath: note.relativePath,
      publishedByPath,
      publishedByStem,
      allAssetCandidates,
      assetReferences,
      warnings,
    })

    const frontmatter = { ...note.parsed.data }
    delete frontmatter.publish

    const output = matter.stringify(rewrittenContent, frontmatter)
    const destination = path.join(notesRoot, note.relativePath)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, output, "utf8")

    for (const assetRelativePath of assetReferences) {
      if (copiedAssets.has(assetRelativePath)) {
        continue
      }

      copiedAssets.add(assetRelativePath)
      await copyVaultFile(assetRelativePath, path.join(notesRoot, assetRelativePath))
    }
  }

  await writeLandingPage(publishedNotes)

  console.log(
    `Exported ${publishedNotes.length} public notes to ${path.relative(siteRoot, notesRoot)}`,
  )

  if (warnings.length > 0) {
    console.warn("\nWarnings:")
    for (const warning of warnings) {
      console.warn(`- ${warning}`)
    }
  }
}

async function assertVaultRoot(rootDir) {
  const stats = await fs.stat(rootDir).catch(() => null)
  if (!stats?.isDirectory()) {
    throw new Error(`Configured vaultRoot does not exist: ${rootDir}`)
  }
}

async function collectMarkdownFiles(rootDir) {
  const results = []
  const entries = await fs.readdir(rootDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") {
      continue
    }

    if (excludedRootDirs.has(entry.name)) {
      continue
    }

    const absolutePath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(absolutePath)
      results.push(...nested.map((file) => path.join(entry.name, file)))
      continue
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
      results.push(entry.name)
    }
  }

  return results
}

async function collectAssetCandidates(rootDir, baseDir = rootDir, found = new Set()) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true })

  for (const entry of entries) {
    if (baseDir === rootDir) {
      if (entry.name.startsWith(".") && entry.name !== ".well-known") {
        continue
      }

      if (excludedRootDirs.has(entry.name)) {
        continue
      }
    }

    const absolutePath = path.join(baseDir, entry.name)

    if (entry.isDirectory()) {
      await collectAssetCandidates(rootDir, absolutePath, found)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const extension = path.extname(entry.name).toLowerCase()
    if (!assetExtensions.has(extension)) {
      continue
    }

    found.add(normalizePath(path.relative(rootDir, absolutePath)))
  }

  return found
}

function buildStemIndex(relativePaths) {
  const map = new Map()

  for (const relativePath of relativePaths) {
    const stem = path.basename(relativePath, path.extname(relativePath)).toLowerCase()
    const existing = map.get(stem) ?? []
    existing.push(normalizePath(relativePath))
    map.set(stem, existing)
  }

  return map
}

function rewriteLinks(content, context) {
  const rewrittenWikiLinks = content.replace(
    /(!?)\[\[([^\]]+)\]\]/g,
    (full, embedPrefix, inner) => {
      return rewriteWikiLink(full, embedPrefix === "!", inner, context)
    },
  )

  return rewrittenWikiLinks.replace(
    /(!?)\[([^\]]*)\]\(([^)]+)\)/g,
    (full, embedPrefix, label, target) => {
      return rewriteMarkdownLink(full, embedPrefix === "!", label, target, context)
    },
  )
}

function rewriteWikiLink(full, isEmbed, inner, context) {
  const [targetPart, aliasPart] = inner.split("|")
  const target = targetPart.trim()
  const alias = aliasPart?.trim()

  if (!target) {
    return full
  }

  if (looksExternal(target)) {
    return full
  }

  if (isAssetPath(target)) {
    const resolvedAsset = resolveAssetTarget(target, context)
    if (!resolvedAsset) {
      context.warnings.push(`${context.sourceRelativePath}: could not resolve asset ${target}`)
      return full
    }

    context.assetReferences.add(resolvedAsset)
    return full
  }

  const noteTarget = resolveNoteTarget(target, context)
  if (!noteTarget) {
    return full
  }

  if (context.publishedByPath.has(noteTarget)) {
    return full
  }

  const fallbackText = alias || readableWikiTarget(target)
  if (isEmbed) {
    context.warnings.push(`${context.sourceRelativePath}: removed embedded private note ${target}`)
    return `> Private embed omitted: ${fallbackText}`
  }

  context.warnings.push(
    `${context.sourceRelativePath}: converted private note link ${target} to text`,
  )
  return fallbackText
}

function rewriteMarkdownLink(full, isEmbed, label, rawTarget, context) {
  const target = rawTarget.trim()

  if (!target || looksExternal(target) || target.startsWith("#")) {
    return full
  }

  const withoutTitle = target.split(/\s+"/)[0]
  const cleanTarget = withoutTitle.replace(/^<|>$/g, "")

  if (isAssetPath(cleanTarget)) {
    const resolvedAsset = resolveAssetTarget(cleanTarget, context)
    if (!resolvedAsset) {
      context.warnings.push(`${context.sourceRelativePath}: could not resolve asset ${cleanTarget}`)
      return full
    }

    context.assetReferences.add(resolvedAsset)
    return full
  }

  const noteTarget = resolveNoteTarget(cleanTarget, context)
  if (!noteTarget) {
    return full
  }

  if (context.publishedByPath.has(noteTarget)) {
    return full
  }

  const fallbackText = label || readableWikiTarget(cleanTarget)
  if (isEmbed) {
    context.warnings.push(
      `${context.sourceRelativePath}: removed embedded private markdown link ${cleanTarget}`,
    )
    return `> Private embed omitted: ${fallbackText}`
  }

  context.warnings.push(
    `${context.sourceRelativePath}: converted private markdown link ${cleanTarget} to text`,
  )
  return fallbackText
}

function resolveNoteTarget(rawTarget, context) {
  const [targetWithoutHeading] = rawTarget.split("#")
  let candidate = normalizePath(targetWithoutHeading)

  if (!candidate) {
    return null
  }

  if (!path.extname(candidate)) {
    candidate = `${candidate}.md`
  }

  const relativeToNote = normalizePath(path.join(context.noteDir, candidate))
  if (context.publishedByPath.has(relativeToNote)) {
    return relativeToNote
  }

  const direct = normalizePath(candidate)
  if (context.publishedByPath.has(direct)) {
    return direct
  }

  const stem = path.basename(candidate, path.extname(candidate)).toLowerCase()
  const matches = context.publishedByStem.get(stem) ?? []

  if (matches.length === 1) {
    return matches[0]
  }

  return matches[0] ?? direct
}

function resolveAssetTarget(rawTarget, context) {
  const [targetWithoutHeading] = rawTarget.split("#")
  const normalized = normalizePath(targetWithoutHeading)

  const relativeToNote = normalizePath(path.join(context.noteDir, normalized))
  if (context.allAssetCandidates.has(relativeToNote)) {
    return relativeToNote
  }

  if (context.allAssetCandidates.has(normalized)) {
    return normalized
  }

  const byName = [...context.allAssetCandidates].filter(
    (assetPath) =>
      path.basename(assetPath).toLowerCase() === path.basename(normalized).toLowerCase(),
  )

  if (byName.length === 1) {
    return byName[0]
  }

  return null
}

function resolveTitle(relativePath, frontmatter) {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim().length > 0) {
    return frontmatter.title.trim()
  }

  return path.basename(relativePath, path.extname(relativePath))
}

function isPublished(value) {
  if (value === true) {
    return true
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true"
  }

  return false
}

function readableWikiTarget(target) {
  return target.split("#")[0].split("/").pop()?.replace(/\.md$/i, "") ?? target
}

function isAssetPath(target) {
  const extension = path.extname(target.split("#")[0]).toLowerCase()
  return assetExtensions.has(extension)
}

function looksExternal(target) {
  return /^[a-z]+:\/\//i.test(target) || target.startsWith("mailto:")
}

async function copyVaultFile(sourceRelativePath, destinationPath) {
  const sourcePath = path.join(vaultRoot, sourceRelativePath)
  await fs.mkdir(path.dirname(destinationPath), { recursive: true })
  await fs.copyFile(sourcePath, destinationPath)
}

async function writeLandingPage(publishedNotes) {
  const page = `---
title: Public Notes
description: A curated public surface for selected notes, systems thinking, and technical writing.
cssclasses:
  - home-page
---


Expect a narrow slice of ongoing work: system design notes, implementation thinking, and drafts that are worth making legible in public.
`

  await fs.writeFile(path.join(contentRoot, "index.md"), page, "utf8")
}

function normalizePath(value) {
  return value.split(path.sep).join("/")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
