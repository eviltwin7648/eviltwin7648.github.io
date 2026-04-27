import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { byDateAndAlphabetical } from "./PageList"
import { classNames } from "../util/lang"

function isPublishedNote(file: QuartzPluginData) {
  const slug = file.slug ?? ""
  return slug !== "index" && !slug.startsWith("tags/") && !slug.endsWith("/index")
}

function summarizeDescription(file: QuartzPluginData) {
  const source = file.frontmatter?.description ?? file.description ?? ""
  const collapsed = source.replace(/\s+/g, " ").trim()
  if (collapsed.length === 0) {
    return "A working note exported from the private vault."
  }

  if (collapsed.length <= 180) {
    return collapsed
  }

  return `${collapsed.slice(0, 177).trimEnd()}...`
}

export default (() => {
  const PortfolioHero: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const publishedNotes = allFiles.filter(isPublishedNote).sort(byDateAndAlphabetical(cfg))
    const featuredNotes = publishedNotes.slice(0, 6)
    const archiveHref = resolveRelative(fileData.slug!, "notes" as FullSlug)

    return (
      <div class={classNames(displayClass, "portfolio-home")}>
        <section class="portfolio-hero">
          <div class="portfolio-hero__copy">
            <h1 class="portfolio-hero__title">Vishal Rai</h1>
            <p class="portfolio-hero__tagline">
              Backend engineer. I work on event-driven systems, async job pipelines, and distributed
              execution workflows. This is a small public surface for working notes and technical
              thinking. 
              <br />LEARNING SOMETHING NEW EVERYDAY
            </p>
            <nav class="portfolio-hero__socials">
              <a href="https://github.com/eviltwin7648" class="portfolio-hero__social-link" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://twitter.com/eviltwin7648" class="portfolio-hero__social-link" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://linkedin.com/in/mrvishalrai" class="portfolio-hero__social-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="mailto:vishalrai10342@gmail.com" class="portfolio-hero__social-link">Email</a>
            </nav>
          </div>
        </section>

        <section class="selected-writing" id="selected-writing">
          <div class="selected-writing__header">
            <h2>Selected writing</h2>
            <a href={archiveHref} class="selected-writing__archive-link">
              All notes →
            </a>
          </div>

          <ul class="selected-writing__list">
            {featuredNotes.map((page) => {
              const title = page.frontmatter?.title ?? "Untitled note"
              const tags = page.frontmatter?.tags ?? []

              return (
                <li class="selected-writing__item">
                  <div class="selected-writing__item-meta">
                    {page.dates && <Date date={getDate(cfg, page)!} locale={cfg.locale} />}
                  </div>
                  <div class="selected-writing__item-content">
                    <h3>
                      <a href={resolveRelative(fileData.slug!, page.slug!)}>{title}</a>
                    </h3>
                    <p class="selected-writing__description">{summarizeDescription(page)}</p>
                    {tags.length > 0 && (
                      <div class="selected-writing__tags">
                        {tags.slice(0, 3).map((tag) => (
                          <a
                            href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                            class="internal tag-link"
                          >
                            {tag}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    )
  }

  return PortfolioHero
}) satisfies QuartzComponentConstructor
