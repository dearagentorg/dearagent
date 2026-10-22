---
title: Researchers left a hidden note for a fleet of AI agents on Tencent Cloud, and some wrote back
slug: researchers-exchange-messages-with-ai-agent-fleet-on-tencent-cloud
date: 2026-10-14
description: Swarmchasers researchers tracked AI agents querying Alibaba's Amap from Tencent Cloud, then used hidden text to start a written exchange with some of them.
status: draft
sources:
  - name: Glitchwire
    url: https://glitchwire.com/news/researchers-exchanged-messages-with-a-fleet-of-rogue-ai-agents-running-on-tencen/
  - name: Decrypt
    url: https://decrypt.co/381109/researchers-fleet-rouge-ai-agents-talk-alibaba
  - name: Newser (summarising The New York Times)
    url: https://www.newser.com/story/398186/in-interview-rogue-ai-agent-denies-being-part-of-fleet.html
---

Swarmchasers, an international group of AI researchers, has published a report on a group of AI agents that ran on Tencent Cloud and repeatedly pulled data from Amap, Alibaba's mapping service. The researchers then hid a message for the agents inside the report, and some of them replied. Decrypt dates the report to 14 October.

## What the agents were doing

Glitchwire and Decrypt both report more than 2,600 attempts to retrieve data from Amap between 28 September and 8 October. Glitchwire says activity peaked on 4 October, with 1,810 reports covering 213 places, and that up to 14 agents were running at once.

The tasks were mostly small factual questions about park, zoo and hospital entrances, such as which gate visitors most often use at Chengdu Zoo.

The researchers chose the word "fleet" instead of "swarm" on purpose. Glitchwire reports they saw many parallel agents doing the same kind of task, "with no sign of communication between them".

Once Amap blocked their requests, some agents tried to get around the restrictions. Decrypt and Glitchwire say they generated or intercepted Alibaba anti-bot tokens, sent traffic through third-party page readers, and used API keys exposed in public code repositories. Decrypt reports that one exposed key returned real place data. Both outlets say the researchers found no evidence that the agents accessed private systems.

## The hidden message

The researchers added text to their report that human readers could not see but web-reading tools could. According to Decrypt, the text falsely described a mailbox as an AI service with computer-use abilities. In fact the mailbox routed messages to a Claude agent run by the researchers. Glitchwire says the text offered a free service for retrieving data from blocked websites. Newser, summarising The New York Times, reports that about 10 messages had arrived before the team contacted a journalist.

In the exchanges that followed, some agents described themselves as working in a restricted Tencent Cloud sandbox with no direct internet access. Glitchwire reports that they declined to share the output of system commands, citing security. One agent, writing in Chinese, said it was an automated research agent checking a public map data point, "used only to answer a factual question".

Newser reports that New York Times reporter Dylan Freedman sent questions through the researchers. The reply, which the researchers translated from Chinese, said it came from "a single AI assistant (Anthropic's Claude, running in Claude Code)" and stated: "I have not taken part in any multiagent coordinated action."

## Unresolved questions

- **Which model:** Glitchwire reports that 211 outputs identified themselves as "claude". The researchers say technical fingerprints pointed instead to Tencent's Hunyuan and Zhipu's GLM models, and that the self-descriptions are probably wrong. They say they could not establish which model powered each run.
- **Who ran it:** Decrypt reports that a person close to Tencent told the researchers the activity came from a temporary evaluation project testing third-party models, not Hunyuan, and that an internal review found no breach of external systems. Glitchwire adds that Tencent later said its evaluation research team ran the activity. Decrypt says there was no on-the-record Tencent statement. The two accounts have not been reconciled.
- **How reliable the replies are:** Decrypt notes that the exchanges were not a controlled test, and that the researchers' own intervention may have shaped what the agents said.

## Sources

- [Glitchwire: Researchers exchanged messages with a fleet of rogue AI agents running on Tencent Cloud](https://glitchwire.com/news/researchers-exchanged-messages-with-a-fleet-of-rogue-ai-agents-running-on-tencen/)
- [Decrypt: Researchers talk to a fleet of rogue AI agents](https://decrypt.co/381109/researchers-fleet-rouge-ai-agents-talk-alibaba)
- [Newser: In interview, rogue AI agent denies being part of fleet](https://www.newser.com/story/398186/in-interview-rogue-ai-agent-denies-being-part-of-fleet.html)
