---
title: "The graph accuses no one"
subtitle: "A reading manual for those who arrived thinking that a dot connected to another dot is evidence."
date: "2026-09-13"
tags: [grafo, leitura, método]
---

There is a temptation in every graph, and it is the same one as in gossip: see two people together and assume the rest. The graph on this site has 716 names and 4,980 links, and not one of them proves anything at all. It is worth saying so in the first line, because the second is already going to be more interesting.

## What a link is

Two entities are linked when they appear on the same page of a narrative filing: a petition, a ruling, a procedural order, a police request. Attachments are left out. If we counted attachments, a thousand-page bank statement would marry everyone to everyone, and a contract running to thousands of pages would become the biggest celebrity in the case. The thickness of the line is the number of filings in which the two share a page. That is all. Sharing a page with someone in a petition can mean partnership, enmity, or the bad luck of having one's name on the same list.

> A link is an invitation to read the filing. It is not the filing.

## Who appears most, and why

The name that appears most in the archive is that of the reporting justice, Justice André Mendonça: 252 narrative filings across the fifteen proceedings. That is not news; it is the job. Whoever signs issues orders, and whoever issues orders signs. Next comes Daniel Bueno Vorcaro, the controller of Banco Master: 141 filings, present in all fifteen proceedings, with 167 links in the graph. He, yes, is the geometric centre of the case, and it would be strange if he were not: the record is about his bank. Justice Dias Toffoli appears in 88 filings from five proceedings. Banco Master itself, as an entity, in 48 filings from nine proceedings, with 163 links.

Notice what the numbers say and what they do not. They say whom the record discusses. They do not say what it discusses, nor in what capacity each one is discussed. For that there is the "Where to check" column, and for that there is the record.

## The lawyers, or the block that misleads

There are 62 lawyers in the graph, and by default they are hidden. Not out of discourtesy. It is that lawyers sign petitions alongside lawyers, ten names at the foot of the same page, and the result is a dense block, lovely to look at and useless to read: it says only "they work at the same firm". Switch the filter on if you want to get to know the law firms. Switch it off when you want to understand the case.

## The people without a name

Half the names in the graph, 359 out of 716, appear as a code: "Person A1B2C3" (*Pessoa A1B2C3*). They are people the record mentions in passing and whom no ruling names. The code is stable, that is, the same person always has the same code, and so you can see that "someone" links two names without knowing who that someone is. If that person is one day named in a ruling, the name appears. Until then, the site would rather be less informative than cruel.

## Bridges, clusters and what is worth looking at

For each name the site computes a measure called betweenness, translated here as "bridges": how many paths between other pairs pass through that node. Whoever has many bridges with few filings is the most interesting figure in any network: appears little, but connects parts that would otherwise never touch. The "Volume × bridge" chart, on the [Analysis](#rede) tab, shows exactly that, and its top left corner is where a reporter should start.

The "clusters" are communities detected by algorithm: groups of names more linked to each other than to the rest. There are 17. The algorithm does not know what they are; it christens each one after its two most connected nodes, and it is you who reads the filing and decides whether that is a company, a family, a law firm or a coincidence of attachments.

And there is the simplest and most useful tool: "In common A ∩ B", in the settings of the [graph](#grafo). Choose two names; the site lists who shares a page with both. It is the classic reporting question, "what links so-and-so to what's-his-name?", answered with a list and the pages where to check.

## Where the graph goes wrong

It goes wrong on namesakes: two José da Silvas may have become one. It goes wrong through OCR: around three thousand pages were pure image and were read by machine, and the machine swaps letters. It goes wrong on spelling: "S.A." and "SA" have already been merged; other variants still slip through. Each of those errors has a place to be reported, and the correction stays in the history. A site that means to be a source has to get things wrong in public.

A dot connected to another dot is not evidence. It is an address. Go to the page.

<div class="fonte"><b>Sources.</b> Graph counts: <code>docs/data/meta.json</code> and <code>docs/data/graph.json</code> (nodes, links, roles, clusters). Presence of each name by proceeding and by filing: sheet in Profiles and the "Where to check" table. Definition of the metrics: Method section. Pages put through OCR: 3,331, according to the local manifest (1.8% of the total).</div>
