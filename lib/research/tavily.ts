import { tavily } from "@tavily/core";
import type { ResearchResult } from "../jobs/types";

export async function researchTopic(topic: string): Promise<ResearchResult> {
  const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
  const res = await client.search(topic, {
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: true,
    topic: "general",
  });

  return {
    answer: res.answer ?? "",
    sources: res.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      publishedDate: r.publishedDate,
    })),
  };
}
