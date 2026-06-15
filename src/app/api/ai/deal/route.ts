import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dealId } = await req.json().catch(() => ({}));
  if (!dealId) return NextResponse.json({ error: "dealId is required" }, { status: 400 });

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, userId },
    include: {
      company: true,
      contact: true,
      activities: { orderBy: { occurredAt: "desc" }, take: 10 },
      tasks: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      summary: `**${deal.title}** is currently in the ${deal.stage.replace("_", " ")} stage with a value of $${Number(deal.value).toLocaleString()}. ${deal.company ? `It's associated with ${deal.company.name} in the ${deal.company.industry} industry.` : ""} ${deal.activities.length > 0 ? `There have been ${deal.activities.length} recent activities logged.` : "No activities have been logged yet."} ${deal.expectedCloseDate ? `The expected close date is ${new Date(deal.expectedCloseDate).toLocaleDateString()}.` : ""}`,
      nextStep: deal.stage === "PROSPECTING"
        ? "Schedule a discovery call to qualify the opportunity and understand the prospect's needs."
        : deal.stage === "QUALIFICATION"
        ? "Send a tailored proposal based on the qualified needs. Focus on ROI and business impact."
        : deal.stage === "PROPOSAL"
        ? "Follow up on the proposal and address any objections. Offer a product demo if appropriate."
        : deal.stage === "NEGOTIATION"
        ? "Finalize contract terms. Consider offering a time-limited incentive to accelerate the close."
        : "Review closed deal for learnings and ensure smooth customer handoff.",
    });
  }

  // Build context for Claude
  const activitiesSummary = deal.activities
    .map((a) => `- [${a.type}] ${a.occurredAt.toLocaleDateString()}: ${a.content}`)
    .join("\n");

  const prompt = `You are a CRM assistant helping a sales rep understand their deal and what to do next.

Deal: ${deal.title}
Stage: ${deal.stage.replace("_", " ")}
Value: $${Number(deal.value).toLocaleString()}
Company: ${deal.company?.name ?? "Unknown"} (${deal.company?.industry ?? "Unknown industry"})
Contact: ${deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : "No contact linked"}
Expected Close: ${deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "Not set"}
Notes: ${deal.notes ?? "None"}

Recent Activities:
${activitiesSummary || "No activities logged yet."}

Open Tasks: ${deal.tasks.filter((t) => !t.completed).length}

Please provide:
1. A 2-3 sentence summary of where this deal stands
2. The single most important next action the sales rep should take

Keep it concise and actionable. Format as JSON with "summary" and "nextStep" fields.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from the response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ summary: text, nextStep: "" });
  } catch (err) {
    console.error("AI deal assistant error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
