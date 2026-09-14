# -*- coding: utf-8 -*-
"""Tradução dos resumos de processos (pipeline/resumos.py) para a edição em inglês.
Mesmas chaves e mesma estrutura; build_en.py grava docs/data/resumos_en.json.
Ao criar ou alterar um resumo em resumos.py, atualize aqui também."""

RESUMOS_EN = {

"INQ 5026": dict(
 t="The origin",
 o="The police inquiry where it all began: BRB's purchase of loan portfolios from Banco Master.",
 r=["This is the oldest case in the archive and the only one that started before the matter reached Brazil's Supreme Court. It investigates the sale of payroll loan portfolios by Banco Master to BRB, the state-owned bank of the Federal District. According to the Federal Police, BRB put around R$ 12 billion into buying credits of doubtful origin, some of them nonexistent or already in default.",
    "The investigation was running at the 10th Federal Court in Brasília, and that is where the orders for the first phase of Operation Compliance Zero came from, carried out on 18 November 2025: arrests, searches and, on the same day, the liquidation of Banco Master by the Central Bank. After a constitutional complaint pointed to evidence against a federal congressman, the case moved up to the Supreme Court and became a police inquiry with Justice André Mendonça as rapporteur.",
    "From February 2026 on, the inquiry began taking in everything: requests from the Senate and from the joint congressional inquiry into the social security agency, motions from congressmen, letters from the Central Bank about another banking group. It is the case with the most filings in the archive after Pet 15.198."],
 m=[("2025-11-18","First phase of the operation; the Central Bank liquidates Banco Master"),
    ("2025-12-09","An injunction at the Supreme Court suspends the investigation in Brasília"),
    ("2026-02-01","The inquiry reaches the Supreme Court with a new rapporteur")],
 s="inq-5026-01-doze-bilhoes-e-duas-associacoes"),

"PET 15198": dict(
 t="The second phase",
 o="What Banco Master did with the money it raised: funds, a sole unitholder and illiquid assets.",
 r=["If the inquiry into the origin asks where the money came from, this petition asks where it went. The investigation started in São Paulo, from an anonymous document, and dealt with how the bank placed the money it raised into receivables investment funds in which Master itself was the sole unitholder.",
    "In January 2026 the case was pulled up to Brazil's Supreme Court and the second overt phase was launched on 14 January, by a ruling of the then rapporteur, Justice Dias Toffoli. In February the case passed to Justice André Mendonça as rapporteur.",
    "It is the largest case in the archive by page count, and for a misleading reason: most of the volume is DVDs holding copies of federal court files attached as evidence. A single annex runs to more than twelve thousand pages."],
 m=[("2026-01-14","Second overt phase of the operation"),
    ("2026-02-13","The petition changes rapporteur"),
    ("2026-06-01","The rapporteur separates the investigation from the stand-alone requests")],
 s="pet-15198-01-de-sao-paulo-a-brasilia"),

"RCL 88121": dict(
 t="The change of address",
 o="The constitutional complaint that moved the whole case from the federal court in Brasília to the Supreme Court.",
 r=["During a search at the home of one of the people under investigation, the Federal Police collected a folder bearing the name of a federal congressman. The defence took that detail to Brazil's Supreme Court, arguing that, with evidence against someone who has the right to be tried only by the Supreme Court, the case could not stay in the lower court.",
    "On 9 December 2025 an injunction suspended the investigation in Brasília, and on 22 December the final ruling brought the inquiry to the Supreme Court. In between, the Central Bank was barred from complying with orders from any other court on the same matter.",
    "The constitutional complaint became final and was closed in February 2026, but it kept receiving paper: a Central Bank report on the special audit at BRB, claims running into the billions and letters from the joint congressional inquiry into the social security agency."],
 m=[("2025-12-09","An injunction suspends the investigation in the lower court"),
    ("2025-12-22","Final ruling: the case stays at the Supreme Court"),
    ("2026-02-01","Final judgment and closure")],
 s="rcl-88121-01-a-pasta"),

"PET 15478": dict(
 t="The disclosure order",
 o="The first request to lift banking and tax secrecy, based on the contents of the phones.",
 r=["In February 2026 the Federal Police brought Brazil's Supreme Court the first extracts from the phones seized in November and, on that basis, asked for the banking and tax secrecy of nine people and four companies to be lifted, covering two years of accounts and tax returns.",
    "The Prosecutor General's Office gave its opinion in three weeks; the ruling took three more months. Once the disclosure order was granted, the Central Bank notified seventy-eight institutions, which replied through a data transmission system called Simba.",
    "It is a small case in pages and a large one in consequence: almost everything that comes later rests on the data obtained here."],
 m=[("2026-02-18","Federal Police filing with the first extracts from the phones"),
    ("2026-06-22","Ruling grants the lifting of secrecy"),
    ("2026-07-01","The banks start to reply")],
 s="pet-15478-01-o-que-os-celulares-disseram"),

"PET 15504": dict(
 t="The supervisors",
 o="The investigation into two heads of banking supervision at the Central Bank.",
 r=["On the afternoon of 7 January 2026, an anonymous tip told the president of the Central Bank that two heads of its banking supervision department had taken money from the owner of Master. The two were questioned internally the same day; within two days the matter was with the Federal Police and, in seven weeks, at Brazil's Supreme Court.",
    "The filing rests on the contents of an iPhone seized from the banker. According to the Federal Police, the messages show draft Master documents reviewed by the people meant to supervise it, guidance for meetings at the Central Bank and a group of three people set up to align strategy.",
    "The police inquiry ran from May to September 2026, with statements from people who saw it from the outside and, at the end, from the three in the message group. No one had been charged over these facts as of September 2026."],
 m=[("2026-01-07","Anonymous tip to the president of the Central Bank"),
    ("2026-02-23","Federal Police filing to the Supreme Court"),
    ("2026-05-14","The police inquiry is opened")],
 s="pet-15504-01-a-denuncia-anonima"),

"PET 15556": dict(
 t="The ruling",
 o="The 48-page ruling that ordered the arrests of the third phase.",
 r=["This is the petition of the ruling. The Federal Police asked for arrests and searches in 164 pages; five days later a 48-page ruling granted them. The Prosecutor General's Office asked for more time to review it and did not get it.",
    "The ruling describes what the police call the group's armed wing: a surveillance and intimidation unit said to cost R$ 1 million a month, of which R$ 400,000 would be split among six people. It also describes the relationship with two Central Bank officials and a consulting contract said to serve as cover for payments.",
    "After the arrest order, the same case file took in a transfer to the federal penitentiary, a death, safe-conduct orders and requests for the return of seized items. In August 2026 it was from here that the order came which gave rise to Pet 16.662."],
 m=[("2026-03-03","Ruling orders arrests and searches"),
    ("2026-03-04","Third overt phase of the operation"),
    ("2026-08-28","Federal Police documents are taken out of the file and become a new case")],
 s="pet-15556-01-setenta-e-duas-horas"),

"PET 15562": dict(
 t="The third phase",
 o="The 159-page filing that asked for the searches of March 2026.",
 r=["Signed by four police chiefs on 1 March 2026, the filing argues that the investigation had changed subject. Until then the case was about loan portfolios and funds; from here on it is also about police officers on the payroll, classified systems searched with someone else's login, a forged official letter sent to a digital platform and threats against enemies.",
    "The filing describes four fronts: influence over Central Bank officials, irregular access to classified information, coercion of critics and manipulation of content in the press and on social media. And it puts the loss to the deposit guarantee fund at R$ 52 billion, a figure the rapporteur's ruling did not repeat.",
    "Nineteen warrants were issued; fourteen were carried out. The months that followed were taken up with petitions about what was left in the sealed boxes."],
 m=[("2026-03-01","Federal Police filing, 159 pages"),
    ("2026-03-03","Ruling by the rapporteur, with 24 hours for the Prosecutor General's Office to review"),
    ("2026-03-04","The warrants are carried out")],
 s="pet-15562-01-cento-e-cinquenta-e-nove-paginas"),

"PET 15563": dict(
 t="The asset freeze",
 o="The asset freeze that reached R$ 22.4 billion at two companies.",
 r=["In the same move as the third phase, the Federal Police asked for the assets of eleven people and companies to be frozen. The arithmetic is uneven on purpose: for the Central Bank officials and the operatives of the so-called crew, amounts in the millions, calculated from what they were said to have received; for two companies described as payment vehicles, the full value of the damage attributed to the whole scheme, R$ 22.4 billion.",
    "The rapporteur gave the Prosecutor General's Office 24 hours, noted that the deadline had passed and granted everything on 3 March 2026. Three days later the Prosecutor General replied in writing, explaining why 24 hours were not enough to read three petitions of more than seven hundred pages each.",
    "The bulk of this case file is the replies: banks, brokerages, the stock exchange, the civil aviation agency and fourteen cryptocurrency exchanges reporting, one by one, what they found. In many cases, accounts with no balance or fractions of a cent."],
 m=[("2026-03-02","Filing seeking asset freezes"),
    ("2026-03-03","Ruling grants the asset freezes"),
    ("2026-03-06","The Prosecutor General's Office answers about the 24-hour deadline")],
 s=None),

"PET 15693": dict(
 t="The cloud",
 o="The order for Apple, Google and Microsoft to hand over the account contents of seventeen people under investigation.",
 r=["This case started small: on 13 March 2026 the Federal Police asked only that Apple and Google freeze the cloud data linked to the seized phones, so that nothing would be deleted while the disclosure request was being prepared. The rapporteur granted it in five days, giving the companies 24 hours.",
    "In May, compliance was reported as partial. On 19 June 2026 the main ruling came: the lifting of electronic data secrecy for seventeen people, in Apple, Google and Microsoft accounts, covering everything since 1 January 2021.",
    "It is the case that shows the size of the material the investigation came to hold: backups, cloud files, calendars, location and browsing history of seventeen people over five years."],
 m=[("2026-03-13","Request to preserve the cloud data"),
    ("2026-03-18","Ruling orders the data frozen within 24 hours"),
    ("2026-06-19","Ruling lifts the electronic data secrecy of seventeen people")],
 s=None),

"PET 15976": dict(
 t="The May searches",
 o="The search and seizure against thirteen people, including a Federal Police chief.",
 r=["On 28 April 2026 the Federal Police asked for searches against thirteen people described as members or supporters of the two operational units it sets out: one for surveillance and intimidation, another for cyber attacks. The ruling came on 13 May, running to 59 pages.",
    "The targets include serving and retired federal police officers, an accountant, a person described as an informal money manager and a couple made up of a police chief and a retired officer, who the police say passed on information from an inquiry they had accessed without any duty to do so.",
    "The next day the rapporteur extended the search to the police chief's own office at the Federal Police headquarters in Minas Gerais. The ruling orders the warrants to be carried out discreetly and without spectacle."],
 m=[("2026-04-28","Filing for search and seizure"),
    ("2026-05-13","Ruling grants searches against thirteen people"),
    ("2026-05-14","Search extended to a police chief's office")],
 s=None),

"PET 15977": dict(
 t="The wiretap",
 o="The interception of the calls and messages of ten people under investigation, for fifteen days.",
 r=["Requested on the same day as the searches and the arrests, this is the wiretap petition. The Federal Police argued that the methods already used had exposed the scheme but did not reach the most current layer of communication: the conversations under way between the people who were still active after two overt phases.",
    "On 11 May 2026 the rapporteur granted the interception of phone calls and the monitoring of messages for ten people, for an initial period of fifteen days counted from actual implementation, and accepted the request from the Prosecutor General's Office that the cloud data be preserved.",
    "It is the smallest of the May cases and the one that left the least trace afterwards: the public archive does not carry the result of the interceptions."],
 m=[("2026-04-28","Filing for phone and electronic interception"),
    ("2026-05-11","Ruling grants the interceptions for fifteen days")],
 s=None),

"PET 15978": dict(
 t="The May arrests",
 o="Seven pre-trial detentions, five sets of precautionary measures and one police chief removed from duty.",
 r=["This is the busiest petition in the May set. The ruling of 13 May 2026 ordered seven pre-trial detentions, among them that of the banker's father, imposed precautionary measures on five other people, removed a Federal Police chief from her duties and ordered a retired officer already in custody to be moved to the federal prison system.",
    "The ruling was upheld by the Second Panel at an in-person session on 16 June. From then on the case became custody routine: requests for release, argument over where a prisoner who is a former police officer should be held, surrender of passports, and a request about medication that the prison refused.",
    "The secrecy on this case file was lifted on 16 June and put back eight days later."],
 m=[("2026-04-28","Filing for arrests and precautionary measures"),
    ("2026-05-13","Ruling orders seven pre-trial detentions"),
    ("2026-06-16","The Second Panel upholds the ruling")],
 s=None),

"PET 16019": dict(
 t="The second freeze",
 o="An asset freeze on seven people under investigation, capped at R$ 1.8 million and R$ 9.6 million.",
 r=["The money side of the May measures. The Federal Police asked for the assets, rights and holdings of seven people to be frozen, with individual caps calculated from what each was said to have received: R$ 1.8 million for the three described as members of the cyber unit and R$ 9.6 million for the four tied to the surveillance unit and to the flow of money.",
    "The ruling of 13 May 2026 ordered the freezing of bank accounts, property, vehicles, boats, aircraft and crypto assets, and notice to the Central Bank, the securities regulator, the civil aviation agency, the port authorities and fourteen cryptocurrency exchanges.",
    "The only bank reply in the public case file shows accounts with no balance and freezes of a few dozen reais."],
 m=[("2026-05-08","Filing seeking asset freezes"),
    ("2026-05-13","Ruling grants the asset freezes"),
    ("2026-06-02","First bank reply: accounts with no balance")],
 s=None),

"PET 16662": dict(
 t="The crisis",
 o="The case born from a single order that ended in an extraordinary session of the full Supreme Court.",
 r=["In August 2026 the rapporteur gave the Federal Police 72 hours to identify who belonged to the network of influence the police attribute to the banker, including people with the right to be tried only by Brazil's Supreme Court. The reply came with annexes and was taken out of Pet 15.556 to form this case, opened under maximum secrecy on 28 August and made public three days later.",
    "On 8 September 2026 the rapporteur suspended the director general of the Federal Police and the force's intelligence director, ordered the internal affairs unit to investigate and halted the production of intelligence reports on the acts of judges, government lawyers and police officers. The review of the decision by the Second Panel was interrupted by a request for more time to study the file.",
    "The next day the president of the Supreme Court suspended the ruling, put the case on hold and called an extraordinary session of the full court. It is the most recent case in the archive and the only one in which the court itself is the subject."],
 m=[("2026-08-24","An order asks the Federal Police to identify the network of influence"),
    ("2026-08-28","The material is taken out of the other case and becomes a case of its own"),
    ("2026-09-01","The rapporteur lifts the secrecy on the case file"),
    ("2026-09-08","Ruling suspends Federal Police leaders"),
    ("2026-09-09","The Presidency suspends the ruling and convenes the full court")],
 s=None),

"INQ 5035": dict(
 t="The project",
 o="The police inquiry into the hiring of influencers to attack the Central Bank.",
 r=["On 6 January 2026 a city councillor from Rio Grande do Sul posted a video saying he had been approached by a crisis management firm to record content defending Banco Master and attacking the Central Bank. The confidentiality agreement he signed before he knew what the job was called the work Project DV.",
    "Twelve days later the Federal Police had a survey of social media profiles, a formal order opening the inquiry and two witness statements. Over the same period the banking federation identified what it described as coordinated attacks on the Central Bank on social media.",
    "It is the smallest inquiry in the archive, with 85 filings, and since May 2026 the police have added nothing more."],
 m=[("2026-01-06","A city councillor posts the video that starts the case"),
    ("2026-01-28","The inquiry is opened"),
    ("2026-02-12","Statements from the two witnesses")],
 s="inq-5035-01-projeto-dv"),
}
