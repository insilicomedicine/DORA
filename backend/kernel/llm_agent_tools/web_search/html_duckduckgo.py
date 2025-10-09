"""DuckDuckGo web search implementation using HTML parsing."""

import logging
import random
from datetime import datetime
from time import sleep
from typing import Any, Dict, List

import httpx
from bs4 import BeautifulSoup
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper

log = logging.getLogger(__name__)

SEARCH_URL = "https://html.duckduckgo.com/html"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://duckduckgo.com/",
    "DNT": "1",
    "Connection": "keep-alive",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    "Upgrade-Insecure-Requests": "1",
}


class RateLimiter:
    def __init__(self, min_delay: float = 10.0, max_delay: float = 15.0):
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.last_request_time = None

    def apply(self):
        now = datetime.now()
        if self.last_request_time is not None:
            time_since_last = (now - self.last_request_time).total_seconds()
            delay = random.uniform(self.min_delay, self.max_delay)  # noqa: S311
            if time_since_last < delay:
                sleep_time = delay - time_since_last
                sleep(sleep_time)

        self.last_request_time = datetime.now()


class HTMLDuckDuckGoWrapper(DuckDuckGoSearchAPIWrapper):
    """DuckDuckGo search wrapper that uses HTML parsing for more reliable results."""

    def __init__(self, min_delay: float = 10.0, max_delay: float = 15.0):
        """Initialize with rate limiting parameters."""
        super().__init__(source="html")
        self._rate_limiter = RateLimiter(min_delay=min_delay, max_delay=max_delay)
        self._session = httpx.Client(headers=HEADERS, follow_redirects=True)
        log.info(f"Initialized HTML DuckDuckGo wrapper with delay {min_delay}-{max_delay}s")

    def _search(self, query: str, max_results: int = 3) -> List[Dict[str, str]]:
        """Perform the search using HTML parsing."""

        try:
            self._rate_limiter.apply()
            log.info(f"Searching DuckDuckGo for: {query}")

            data = {"q": query, "kl": "us-en", "v": "l", "s": "0"}
            response = self._session.post(url=SEARCH_URL, data=data, timeout=30.0)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            results = []
            position = 0

            for result in soup.select(".result"):
                if position >= max_results:
                    break

                title_elem = result.select_one(".result__title")
                snippet_elem = result.select_one(".result__snippet")
                link_elem = result.select_one(".result__url")

                if not all([title_elem, snippet_elem, link_elem]):
                    continue

                title = title_elem.get_text(strip=True)
                snippet = snippet_elem.get_text(strip=True)
                link = link_elem.get_text(strip=True)

                if not link.startswith("http"):
                    link = "https://" + link

                if "duckduckgo.com/y.js" in link:
                    continue

                position += 1
                results.append({"title": title, "link": link, "snippet": snippet})

            return results

        except Exception as e:
            log.error(f"Error searching DuckDuckGo: {e}")
            return []

    def results(self, query: str, max_results: int = 3, **kwargs: Any) -> List[Dict[str, str]]:
        """Get search results for the query."""
        return self._search(query, max_results=max_results)

    def run(self, query: str, **kwargs: Any) -> str:
        """Run search and return results as a formatted string."""
        results = self._search(query, max_results=kwargs.get("max_results", 3))
        if not results:
            return "No good search result was found"

        return "\n\n".join(f"Title: {r['title']}\nURL: {r['link']}\nSnippet: {r['snippet']}" for r in results)
