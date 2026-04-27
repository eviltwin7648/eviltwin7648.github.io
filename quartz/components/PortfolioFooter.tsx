import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"
import { classNames } from "../util/lang"

export default (() => {
  const PortfolioFooter: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const year = new Date().getFullYear()

    return (
      <footer class={classNames(displayClass, "portfolio-footer")}>
        <div>
          <p class="portfolio-footer__title">Vishal Rai</p>
          <p class="portfolio-footer__copy">
            Field notes, system sketches, and selected writing from a private vault.
          </p>
        </div>
        <div class="portfolio-footer__links">
          <a href={resolveRelative(fileData.slug!, "index" as FullSlug)}>Home</a>
          <a href={resolveRelative(fileData.slug!, "notes" as FullSlug)}>Notes</a>
          <a href={resolveRelative(fileData.slug!, "tags" as FullSlug)}>Tags</a>
        </div>
        <p class="portfolio-footer__year">{year}</p>
      </footer>
    )
  }

  return PortfolioFooter
}) satisfies QuartzComponentConstructor
