import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { DiscordIcon } from "@/components/DiscordIcon";
import { useFooterContent } from "@/lib/footerContent";

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

type FooterProps = {
  forceLight?: boolean;
};

const Footer = ({ forceLight = false }: FooterProps) => {
  const content = useFooterContent();
  const brandTitleClass = forceLight ? "text-slate-900" : "text-foreground";
  const mutedTextClass = forceLight ? "text-slate-700" : "text-muted-foreground";
  const headingClass = forceLight ? "text-rose-700" : "text-primary";
  const linkClass = forceLight ? "text-slate-700 transition-colors hover:text-rose-700" : "text-muted-foreground transition-colors hover:text-primary";
  const copyrightClass = forceLight ? "text-slate-900" : "text-foreground/95";
  const dividerClass = forceLight ? "text-slate-400" : "text-muted-foreground/45";
  const developerLinkClass = forceLight
    ? "font-latin-display font-medium text-rose-700 underline-offset-2 transition-colors hover:text-rose-800 hover:underline"
    : "font-latin-display font-medium text-primary underline-offset-2 transition-colors hover:text-primary/85 hover:underline";

  return (
    <footer
      dir="rtl"
      className={
        forceLight
          ? "relative border-t border-rose-200 bg-gradient-to-b from-[#fff4f5] via-[#fff8f8] to-[#fffafb] pt-20 text-slate-900"
          : "relative border-t border-primary/25 bg-gradient-to-b from-background via-background to-muted/20 pt-20"
      }
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/50 to-transparent" />

      <div className="w-full px-4 py-14 pb-[max(3rem,calc(env(safe-area-inset-bottom,0px)+2rem))] md:px-8 xl:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <Link to="/" className="group inline-block shrink-0 leading-none" aria-label="العودة للرئيسية">
                <img
                  src="/trustLogo.png"
                  alt="TRUST CFW Logo"
                  className="h-10 w-10 object-contain drop-shadow-[0_0_22px_hsl(var(--primary)/0.95)]"
                  loading="lazy"
                />
              </Link>
              <div className="leading-tight">
                <div className={`font-latin-display text-base font-bold tracking-widest ${brandTitleClass}`}>TRUST</div>
                <div className="-mt-1 font-latin-display text-[10px] tracking-[0.3em] text-primary">C F W</div>
              </div>
            </div>
            <p className={`mt-4 max-w-sm text-sm leading-relaxed ${mutedTextClass}`}>
              سيرفر رول بلاي عربي — قوانين واضحة، فريق إدارة متواجد، ومجتمع يهتم بالتجربة.
            </p>
          </div>

          <div className="md:col-span-4">
            <h3 className={`font-display text-sm font-bold tracking-wide ${headingClass}`}>{content.quickLinksTitle}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {content.quickLinks.map((item) => (
                <li key={item.id}>
                  {isExternalUrl(item.to) ? (
                    <a
                      href={item.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm ${linkClass}`}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.to} className={`text-sm ${linkClass}`}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className={`font-display text-sm font-bold tracking-wide ${headingClass}`}>{content.contactTitle}</h3>
            <p className={`mt-3 text-sm leading-relaxed ${mutedTextClass}`}>
              {content.contactBody}
            </p>
            <a
              href={content.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex items-center gap-2 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 px-4 py-2.5 text-sm font-medium transition-colors hover:border-[#5865F2]/60 hover:bg-[#5865F2]/20 ${forceLight ? "text-[#3347e4]" : "text-[#c9cdfb]"}`}
            >
              <DiscordIcon className="h-5 w-5 shrink-0 text-[#5865F2]" />
              <span className="font-display">{content.discordLabel}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            </a>
          </div>
        </div>

        <div className={`mx-auto mt-12 max-w-6xl px-2 pb-6 pt-8 ${forceLight ? "border-t border-rose-200" : "border-t border-primary/15"}`}>
          <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center text-[11px] leading-relaxed sm:gap-x-3 sm:text-xs ${mutedTextClass}`}>
            <span className={`font-display font-semibold ${copyrightClass}`}>
              © {new Date().getFullYear()} TRUST CFW
            </span>
            <span className={`select-none ${dividerClass}`} aria-hidden>
              ·
            </span>
            <span className="font-display">{content.rightsText}</span>
            <span className={`select-none ${dividerClass}`} aria-hidden>
              ·
            </span>
            <span className="font-display tracking-[0.12em]">{content.madeWithText}</span>
            <span className={`select-none ${dividerClass}`} aria-hidden>
              ·
            </span>
            <span>
              {content.developerLabel}:{" "}
              <a
                href={content.developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={developerLinkClass}
              >
                {content.developerName}
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
