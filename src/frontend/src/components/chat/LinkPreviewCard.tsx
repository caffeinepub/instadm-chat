import { ExternalLink } from "lucide-react";

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

export function extractUrls(text: string): string[] {
  return Array.from(text.matchAll(URL_REGEX), (m) => m[0]);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return `${url.slice(0, maxLen)}…`;
}

interface LinkPreviewCardProps {
  url: string;
  isSender: boolean;
}

export function LinkPreviewCard({ url, isSender }: LinkPreviewCardProps) {
  const domain = getDomain(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-1.5 no-underline group"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={
          isSender
            ? "border-l-[3px] border-white/60 bg-white/10 rounded-r-lg px-2.5 py-1.5"
            : "link-preview-card"
        }
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${isSender ? "bg-white/70" : "bg-blue-400"}`}
          />
          <span
            className={`text-[11px] font-semibold truncate ${isSender ? "text-white/80" : "text-blue-600 dark:text-blue-400"}`}
          >
            {domain}
          </span>
          <ExternalLink
            size={10}
            className={`flex-shrink-0 opacity-60 ${isSender ? "text-white" : "text-muted-foreground"}`}
          />
        </div>
        <p
          className={`text-[11px] truncate ${isSender ? "text-white/60" : "text-muted-foreground"}`}
        >
          {truncateUrl(url)}
        </p>
      </div>
    </a>
  );
}
