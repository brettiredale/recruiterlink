-- Reference data and the auditable rules used to clean the old site's data.
-- Nothing here touches schema legacy; it only reads from it.

-- Countries (ISO 3166-1 alpha-2). "Scotland" in the old data is United Kingdom.
insert into public.countries (name, slug, iso2) values
  ('Australia', 'australia', 'AU'),
  ('Austria', 'austria', 'AT'),
  ('Belgium', 'belgium', 'BE'),
  ('Bermuda', 'bermuda', 'BM'),
  ('Canada', 'canada', 'CA'),
  ('Denmark', 'denmark', 'DK'),
  ('Finland', 'finland', 'FI'),
  ('France', 'france', 'FR'),
  ('Germany', 'germany', 'DE'),
  ('Greece', 'greece', 'GR'),
  ('Hong Kong', 'hong-kong', 'HK'),
  ('India', 'india', 'IN'),
  ('Ireland', 'ireland', 'IE'),
  ('Italy', 'italy', 'IT'),
  ('Lebanon', 'lebanon', 'LB'),
  ('Mexico', 'mexico', 'MX'),
  ('Netherlands', 'netherlands', 'NL'),
  ('New Zealand', 'new-zealand', 'NZ'),
  ('Nigeria', 'nigeria', 'NG'),
  ('Norway', 'norway', 'NO'),
  ('Poland', 'poland', 'PL'),
  ('Russia', 'russia', 'RU'),
  ('Singapore', 'singapore', 'SG'),
  ('South Africa', 'south-africa', 'ZA'),
  ('Spain', 'spain', 'ES'),
  ('Sweden', 'sweden', 'SE'),
  ('Switzerland', 'switzerland', 'CH'),
  ('Turkey', 'turkey', 'TR'),
  ('United Arab Emirates', 'united-arab-emirates', 'AE'),
  ('United Kingdom', 'united-kingdom', 'GB'),
  ('United States', 'united-states', 'US');

-- The fixed list of recruitment sectors.
insert into public.specialisms (name, slug, sort_order) values
  ('Accounting & Finance', 'accounting-finance', 10),
  ('Administration & Office Support', 'administration-office-support', 20),
  ('Aerospace, Aviation & Defence', 'aerospace-aviation-defence', 30),
  ('Agriculture & Agritech', 'agriculture-agritech', 40),
  ('AI & Machine Learning', 'ai-machine-learning', 50),
  ('Architecture & Planning', 'architecture-planning', 60),
  ('Automotive', 'automotive', 70),
  ('Banking & Financial Services', 'banking-financial-services', 80),
  ('Blockchain & Web3', 'blockchain-web3', 90),
  ('Compliance & Risk', 'compliance-risk', 100),
  ('Construction & Trades', 'construction-trades', 110),
  ('Consulting & Advisory', 'consulting-advisory', 120),
  ('Creative & Design', 'creative-design', 130),
  ('Customer Service', 'customer-service', 140),
  ('Cybersecurity', 'cybersecurity', 150),
  ('Data & Analytics', 'data-analytics', 160),
  ('Education & Training', 'education-training', 170),
  ('Energy & Renewables', 'energy-renewables', 180),
  ('Engineering', 'engineering', 190),
  ('Executive Search', 'executive-search', 200),
  ('Government & Public Sector', 'government-public-sector', 210),
  ('Healthcare & Medical', 'healthcare-medical', 220),
  ('Hospitality & Tourism', 'hospitality-tourism', 230),
  ('Human Resources', 'human-resources', 240),
  ('Information Technology', 'information-technology', 250),
  ('Insurance', 'insurance', 260),
  ('Legal', 'legal', 270),
  ('Life Sciences & Pharmaceuticals', 'life-sciences-pharmaceuticals', 280),
  ('Manufacturing & Production', 'manufacturing-production', 290),
  ('Marketing & Communications', 'marketing-communications', 300),
  ('Media & Entertainment', 'media-entertainment', 310),
  ('Mining & Resources', 'mining-resources', 320),
  ('Non-profit & Charity', 'non-profit-charity', 330),
  ('Nursing & Allied Health', 'nursing-allied-health', 340),
  ('Operations', 'operations', 350),
  ('Project Management', 'project-management', 360),
  ('Real Estate & Property', 'real-estate-property', 370),
  ('Retail & Consumer Goods', 'retail-consumer-goods', 380),
  ('Sales & Business Development', 'sales-business-development', 390),
  ('Social Care', 'social-care', 400),
  ('Software Development', 'software-development', 410),
  ('Supply Chain & Logistics', 'supply-chain-logistics', 420),
  ('Sustainability & Environment', 'sustainability-environment', 430),
  ('Telecommunications', 'telecommunications', 440);

-- Per-agency location corrections, each backed by evidence in the old record.
create table private.legacy_agency_overrides (
  agency_id uuid primary key,
  country text not null,
  city text,
  note text not null
);
alter table private.legacy_agency_overrides enable row level security;
comment on table private.legacy_agency_overrides is
  'Corrections to country/city for individual old-site records (self-registered listings defaulted to United States with no city).';
insert into private.legacy_agency_overrides (agency_id, country, city, note) values
  ('39f4afa3-81e3-4a9f-b1eb-73527e9997eb', 'United Kingdom', 'Glasgow', 'Old record had country "Scotland" and city "United Kingdom"; description says the firm started in Glasgow.'),
  ('2c18c8a7-1399-4421-94e2-9e382a07bce4', 'United Kingdom', 'Edinburgh', 'Old record defaulted to United States; .co.uk site and office address in Edinburgh.'),
  ('8e45aadc-0e04-4eec-af15-3444a6845613', 'United Kingdom', null, 'Old record defaulted to United States; .co.uk site. City unknown.'),
  ('fd0d052d-1f79-4501-b051-64907a41d7a2', 'Ireland', 'Galway', 'Old record defaulted to United States; .ie site and office address in Galway.'),
  ('f8375e09-56c0-496d-9e93-38e72b95a155', 'New Zealand', null, 'Old record defaulted to United States; .co.nz site, description says New Zealand. City unknown.'),
  ('fef9255f-8be7-45d9-b056-52ed8a8b8511', 'New Zealand', 'Auckland', 'Old record defaulted to United States; .co.nz site, description says Auckland North Shore.'),
  ('6ce93557-6d07-4c16-aa69-15e33b8987ae', 'Australia', 'Sydney', 'Old record defaulted to United States; office address in Surry Hills, Sydney.'),
  ('c1f4316b-1dcd-4663-a444-f63d041201c2', 'Australia', 'Sydney', 'Old record defaulted to United States; office address in Pitt Street, Sydney.');

-- City spellings in the old data and the single name each becomes.
create table private.legacy_city_map (
  country text not null,
  legacy_city text not null,
  city text not null,
  primary key (country, legacy_city)
);
alter table private.legacy_city_map enable row level security;
comment on table private.legacy_city_map is
  'Old-site city spellings (local-language names, typos, ASCII transliterations, truncated capitals) and the city name used now. Cities not listed keep their old spelling.';
insert into private.legacy_city_map (country, legacy_city, city) values
  ('Germany', 'Frankfurt am Main', 'Frankfurt'),
  ('Germany', 'Hannover', 'Hanover'),
  ('Germany', 'Koeln', 'Cologne'),
  ('Germany', 'Muenchen', 'Munich'),
  ('Germany', 'Nuernberg', 'Nuremberg'),
  ('Germany', 'Muelheim', 'Mülheim an der Ruhr'),
  ('Germany', 'Muelheim an der Ruhr', 'Mülheim an der Ruhr'),
  ('Germany', 'Offenbach am Main', 'Offenbach'),
  ('Germany', 'Duesseldorf', 'Düsseldorf'),
  ('Germany', 'Muenster', 'Münster'),
  ('Germany', 'Moenchengladbach', 'Mönchengladbach'),
  ('Germany', 'Gruenwald', 'Grünwald'),
  ('Germany', 'Luebeck', 'Lübeck'),
  ('Germany', 'Saarbruecken', 'Saarbrücken'),
  ('Germany', 'Wuerzburg', 'Würzburg'),
  ('Germany', 'Guetersloh', 'Gütersloh'),
  ('Germany', 'Osnabrueck', 'Osnabrück'),
  ('Germany', 'Unterfoehring', 'Unterföhring'),
  ('Germany', 'Boeblingen', 'Böblingen'),
  ('Germany', 'Fuerth', 'Fürth'),
  ('Belgium', 'Brussel', 'Brussels'),
  ('Belgium', 'Bruxelles', 'Brussels'),
  ('Belgium', 'Antwerpen', 'Antwerp'),
  ('Switzerland', 'Zuerich', 'Zurich'),
  ('Switzerland', 'Saint Gallen', 'St. Gallen'),
  ('Switzerland', 'Duebendorf', 'Dübendorf'),
  ('Switzerland', 'Koeniz', 'Köniz'),
  ('Switzerland', 'Neuchatel', 'Neuchâtel'),
  ('Denmark', 'Kobenhavn', 'Copenhagen'),
  ('Denmark', 'Naestved', 'Næstved'),
  ('Denmark', 'Koge', 'Køge'),
  ('Denmark', 'Soborg', 'Søborg'),
  ('Denmark', 'Horsholm', 'Hørsholm'),
  ('Sweden', 'Malmoe', 'Malmö'),
  ('Sweden', 'Joenkoeping', 'Jönköping'),
  ('Sweden', 'Vaesteras', 'Västerås'),
  ('Sweden', 'Linkoeping', 'Linköping'),
  ('Sweden', 'Vaexjoe', 'Växjö'),
  ('Sweden', 'Vaernamo', 'Värnamo'),
  ('Sweden', 'Norrkoeping', 'Norrköping'),
  ('Sweden', 'Taeby', 'Täby'),
  ('Sweden', 'Gaevle', 'Gävle'),
  ('Sweden', 'Moelndal', 'Mölndal'),
  ('Sweden', 'Soedertaelje', 'Södertälje'),
  ('Sweden', 'Lulea', 'Luleå'),
  ('Sweden', 'Umea', 'Umeå'),
  ('Sweden', 'Boras', 'Borås'),
  ('Austria', 'Saint Poelten', 'St. Pölten'),
  ('Austria', 'Voecklabruck', 'Vöcklabruck'),
  ('United Arab Emirates', 'Al Sharjah', 'Sharjah'),
  ('Italy', 'Roma', 'Rome'),
  ('Italy', 'Genova', 'Genoa'),
  ('Russia', 'Moskva', 'Moscow'),
  ('Russia', 'Sankt-Peterburg', 'Saint Petersburg'),
  ('Mexico', 'Ciudad de Mexico', 'Mexico City'),
  ('Greece', 'Athina', 'Athens'),
  ('Netherlands', '''s Hertogenbosch', '''s-Hertogenbosch'),
  ('Netherlands', 'Den Haag', 'The Hague'),
  ('Spain', 'Sevilla', 'Seville'),
  ('New Zealand', 'Taurango', 'Tauranga'),
  ('Australia', 'Townsville City', 'Townsville'),
  ('United States', 'Saint Louis Park', 'St. Louis Park'),
  ('United States', 'EAST GRAND RA', 'East Grand Rapids'),
  ('United States', 'LA CANADA FLT', 'La Cañada Flintridge'),
  ('United States', 'PRINCE', 'Prince'),
  ('United States', 'ARSENAL', 'Arsenal'),
  ('United States', 'MONARCH BAY', 'Monarch Bay');

-- Ordered rules that map a messy old label to one specialism. The first rule
-- (lowest priority number) whose pattern matches the label wins; a rule with
-- no specialism drops the label on purpose. \y is a word boundary.
create table private.specialism_rules (
  priority smallint primary key,
  pattern text not null,
  specialism_slug text references public.specialisms (slug)
);
alter table private.specialism_rules enable row level security;
comment on table private.specialism_rules is
  'Ordered, case-insensitive regular expressions that map old specialism / industry labels to public.specialisms. First match wins; null specialism_slug means drop.';
insert into private.specialism_rules (priority, pattern, specialism_slug) values
  (10, $re$invalid|^n/?a$|^none$|^other$|^various|^general$|^all (industries|sectors)|^multiple|^unknown$re$, null),
  (20, $re$team building$re$, null),
  (30, $re$data cent(er|re)|database|(system|enterprise|solutions?|cloud|software|technical) architect$re$, 'information-technology'),
  (40, $re$law enforcement$re$, 'government-public-sector'),
  (50, $re$(gene|cell) therapy|cell (&|and) gene|drug (discovery|development)$re$, 'life-sciences-pharmaceuticals'),
  (60, $re$revenue cycle|medical (billing|coding)|managed care|sports medicine|health ?tech|behaviou?ral health$re$, 'healthcare-medical'),
  (70, $re$ed ?tech\y$re$, 'education-training'),
  (80, $re$\y(ad|mar) ?tech\y$re$, 'marketing-communications'),
  (90, $re$account manag$re$, 'sales-business-development'),
  (100, $re$cyber|infosec|information security$re$, 'cybersecurity'),
  (110, $re$blockchain|crypto|web3|\ydefi\y$re$, 'blockchain-web3'),
  (120, $re$artificial intelligence|machine learning|\yai\y|\yml\y|generative|deep learning$re$, 'ai-machine-learning'),
  (130, $re$data (science|analytics|engineering|analysis|management|&)|analytics|business intelligence|big data|\ydata\y$re$, 'data-analytics'),
  (140, $re$executive search|executive (recruit|leadership|level|management|appointments)|c-suite|c-level|\yboard\y|senior (leadership|management|executive)|headhunt|leadership (search|recruit|roles)$re$, 'executive-search'),
  (150, $re$fintech|financial technology$re$, 'banking-financial-services'),
  (160, $re$insur|actuari|underwriting$re$, 'insurance'),
  (170, $re$health (&|and) safety|health, safety|\yhse\y|\yhseq\y|occupational health|oh&s$re$, 'compliance-risk'),
  (180, $re$hospitality|touris|hotel|restaurant|catering|\ytravel (&|and) |leisure|\yevents?\y|\ychefs?\y|culinary|cruise|yacht|\ysports?\y|fitness|casino|\yclubs?\y|resort|\ygolf$re$, 'hospitality-tourism'),
  (190, $re$oil|\ygas\y|energy|renewable|solar|\ywind\y|power (generation|&|systems|industry)|utilit|nuclear|petro|offshore|electricity|hydrogen$re$, 'energy-renewables'),
  (200, $re$sustainab|environment|green|clean ?tech|\yesg\y|climate|\yecolog|waste|recycl|\ywater$re$, 'sustainability-environment'),
  (210, $re$nurs|allied health|physiotherap|therap(y|ist)|locum|radiograph|midwi|caregiv|home ?care|home health$re$, 'nursing-allied-health'),
  (220, $re$social (care|work|services)|long.?term care|senior (living|care)|assisted living|estate management|household|private (service|staff)|butler|housekeeper|care homes?|aged care|elderly care|child ?care|disability|community (care|services)|residential care|support work|domiciliary|nanny|nannies|domestic staff|household staff$re$, 'social-care'),
  (230, $re$pharma|biotech|life ?science|medical devices?|med ?tech|clinical research|clinical trials|\ycro\y|biopharma|genomic|laborator|scientific|\yr&d\y|research (&|and) development|biolog|chemistry|\yscience\y$re$, 'life-sciences-pharmaceuticals'),
  (240, $re$health ?(care)?( |$|,|&)|\yhealth\y|medic|hospital|clinic|dental|dentist|physician|doctor|veterin|optom|surg|wellness|wellbeing|diagnostic|primary care|critical care|acute care|urgent care|radiolog|anesthes|oncolog|hospice|rehabilitation|advanced practice|pediatric|paediatric|cardiolog|psychiatr|patient|ambulatory|emergency (medicine|services)$re$, 'healthcare-medical'),
  (250, $re$software|web development|developer|devops|\ysaas\y|full.?stack|front.?end|back.?end|mobile (app|dev)|programming|product management|\yux\y.*(research|engineer)|app development$re$, 'software-development'),
  (260, $re$telecom|wireless|\y5g\y|broadband$re$, 'telecommunications'),
  (270, $re$\yit\y|\yi\.t\.|information technology|\ytech\y|technology|cloud|digital transformation|\ysap\y|\yerp\y|salesforce|microsoft|dynamics 365|network(ing)? |infrastructure (services|engineering)|internet of things|\yiot\y|comput|quantum|virtual.?reality|augmented reality|\yvr\y|semiconductor|electronics|high.?tech|digital$|^digital (services|technology|solutions|&)$re$, 'information-technology'),
  (280, $re$architect(ure)?( |$|,|&)|urban (planning|design)|town planning|built environment|interior design|landscape$re$, 'architecture-planning'),
  (290, $re$\ydesign\y|creative|\yux\y|\yui\y|\ygraphic|fashion design|\yart(s)?\y|animation|photograph$re$, 'creative-design'),
  (300, $re$\ylaw\y|legal|lawyer|attorney|paralegal|solicitor|barrister|litigation|patent|intellectual property$re$, 'legal'),
  (310, $re$complian|regulat|\yrisk\y|governance|health (&|and) safety|\yhse\y|\yhseq\y|\yehs\y|oh&s|occupational health|safety|financial crime|\yaml\y|anti.money$re$, 'compliance-risk'),
  (320, $re$accountan|accounting|\yaccounts\y|bookkeep|audit|\ytax\y|taxation|payroll|controller|\ycfo\y|\ycpa\y|treasury|finance (&|and) account|^finance$|^finance (&|and) (admin|operations)|corporate finance|financial (planning|accounting|management|control|reporting|analysis)$re$, 'accounting-finance'),
  (330, $re$bank|financ|invest|asset management|wealth|private equity|venture capital|hedge fund|capital markets|trading|securities|mortgage|\ym&a\y|mergers|credit|fund management|family office|payments$re$, 'banking-financial-services'),
  (340, $re$aerospace|aviation|airline|aircraft|defen[cs]e|military|space\y|security (&|and) (defen|close)|national security|security clearance|veteran$re$, 'aerospace-aviation-defence'),
  (350, $re$automotive|motor (trade|industry|vehicle)|\ycar\y|vehicle|e-?mobility|motorsport$re$, 'automotive'),
  (360, $re$mining|\ymines?\y|mineral|resources (&|and) mining|quarry|metals$re$, 'mining-resources'),
  (370, $re$agri|farm|horticult|food production|forestry|aquaculture|fisher|viticult|\ywine\y|equine|animal$re$, 'agriculture-agritech'),
  (380, $re$supply chain|logistic|warehous|transport|freight|shipping|maritime|marine|distribution|procure|purchasing|driving|drivers?\y|\yhgv\y|trucking|fleet|rail|courier|import|export|sourcing (&|and)$re$, 'supply-chain-logistics'),
  (390, $re$civil engineering|construct|\ytrades\y|skilled trade|building|general contract|subcontract|infrastructure|carpent|plumb|electrician|welding|\yhvac\y|joinery|scaffold|quantity survey|surveying|roofing|housebuilding|groundworks|labou?r hire|labou?rers?$re$, 'construction-trades'),
  (400, $re$real estate|property|facilit|cleaning|housekeeping|janitor|housing|lettings|estate agen|proptech$re$, 'real-estate-property'),
  (410, $re$engineer|robotic|automation|mechatronic|\ycad\y|technical (services|support|staff|roles|recruitment|trades|personnel|professionals)|maintenance|technician|^technical$$re$, 'engineering'),
  (420, $re$manufactur|production|industrial|factory|\yquality\y|chemical|materials|plastics|packaging|machin|assembly|process industry|steel|textile|printing|^industry$|lean\y$re$, 'manufacturing-production'),
  (430, $re$project|program(me)? management|\ypmo\y|change management|transformation|interim management|agile|scrum$re$, 'project-management'),
  (440, $re$recruit|staffing|talent|human resources?|\yhr\y|\yh\.r\.|people (&|and) culture|workforce|personnel|employment|diversity|inclusion|\ydei\y|compensation|benefits|employer branding|outplacement|career|organi[sz]ational development|learning (&|and) development|\yl&d\y|leadership development|coaching|\yrpo\y|head ?count|labou?r (market|leasing)|temporary (work|staff)|temp\y|payrolling|onboarding|assessment$re$, 'human-resources'),
  (450, $re$educat|teach|school|academ|universit|training|tutor|e-?learning|early years|childcare|\ysen\y|lectur$re$, 'education-training'),
  (460, $re$government|public sector|public (service|administration|safety)|local authorit|civil service|federal|municipal|council|politic|policy$re$, 'government-public-sector'),
  (470, $re$non.?profit|charit|not.for.profit|\yngo\y|third sector|fundrais|philanthrop|voluntary|faith|church|association$re$, 'non-profit-charity'),
  (480, $re$retail|consumer|e-?commerce|\yfmcg\y|\ycpg\y|fashion|apparel|luxury|beauty|cosmetic|food|beverage|grocery|wholesale|merchandis|durables$re$, 'retail-consumer-goods'),
  (490, $re$marketing|advertis|public relations|\ypr\y|communications?\y|content|copywrit|brand|\yseo\y|social media|market research|\ycrm\y|digital agenc$re$, 'marketing-communications'),
  (500, $re$\ymedia\y|broadcast|entertainment|film|television|\ytv\y|publishing|gaming|games|esports|music|journalis|editorial|streaming$re$, 'media-entertainment'),
  (510, $re$customer|call cent|contact cent|client (service|success|relations)|help ?desk|service desk|technical support$re$, 'customer-service'),
  (520, $re$sales|business development|account manag|commercial\y|revenue|go.to.market|\ygtm\y$re$, 'sales-business-development'),
  (530, $re$admin|office|secretar|clerical|receptio|personal assistant|\ypa\y|executive assistant|business support|executive support|data entry|back.?office|virtual assistant$re$, 'administration-office-support'),
  (540, $re$consult|advisory|outsourc|professional services|business services|strategy|\ymanagement\y|leadership$re$, 'consulting-advisory'),
  (550, $re$operation$re$, 'operations'),
  (560, $re$security$re$, 'aerospace-aviation-defence');

-- Every distinct old label, how often it was used, and where it now points.
create table private.legacy_specialism_map (
  legacy_label text primary key,
  links_in_specializations integer not null,
  links_in_industry_focus integer not null,
  rule_priority smallint references private.specialism_rules (priority),
  specialism_id smallint references public.specialisms (id)
);
alter table private.legacy_specialism_map enable row level security;
comment on table private.legacy_specialism_map is
  'Audit trail: each distinct label from legacy specializations and industry_focus, its usage counts, the rule that matched and the specialism it maps to (null = dropped).';

insert into private.legacy_specialism_map
  (legacy_label, links_in_specializations, links_in_industry_focus, rule_priority, specialism_id)
select l.label, l.in_spec, l.in_focus, r.priority, s.id
from (
  select label,
         count(*) filter (where src = 's')::integer as in_spec,
         count(*) filter (where src = 'f')::integer as in_focus
  from (
    select btrim(x) as label, 's' as src from legacy.recruitment_agencies, unnest(specializations) as x
    union all
    select btrim(x), 'f' from legacy.recruitment_agencies, unnest(industry_focus) as x
  ) u
  where label <> ''
  group by label
) l
left join lateral (
  select sr.priority, sr.specialism_slug
  from private.specialism_rules sr
  where l.label ~* sr.pattern
  order by sr.priority
  limit 1
) r on true
left join public.specialisms s on s.slug = r.specialism_slug;

-- Rules that remove the old site's false "established in 2020" claims.
-- The old founded-year field was 2020 for almost every agency and the
-- generated introductions repeated it. Each rule is a regular expression
-- replacement applied in order; anything left over is handled by dropping
-- the sentence (introductions only).
create table private.text_cleaning_rules (
  kind text not null check (kind in ('introduction', 'description')),
  step smallint not null,
  pattern text not null,
  replacement text not null,
  primary key (kind, step)
);
alter table private.text_cleaning_rules enable row level security;
comment on table private.text_cleaning_rules is
  'Ordered regexp_replace rules used by private.strip_founding_2020 to remove false "established/founded in 2020" and "since 2020" claims.';
insert into private.text_cleaning_rules (kind, step, pattern, replacement) values
  ('introduction', 1, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020,? our $re$, $re$\1Our $re$),
  ('introduction', 2, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020,? we’ve $re$, $re$\1We’ve $re$),
  ('introduction', 3, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020,? we've $re$, $re$\1We've $re$),
  ('introduction', 4, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020,? we $re$, $re$\1We $re$),
  ('introduction', 5, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020,? the $re$, $re$\1The $re$),
  ('introduction', 6, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020,? they $re$, $re$\1They $re$),
  ('introduction', 7, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in 2020 and based $re$, $re$\1Based $re$),
  ('introduction', 8, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in 2020 and headquartered $re$, $re$\1Headquartered $re$),
  ('introduction', 9, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in 2020 and located $re$, $re$\1Located $re$),
  ('introduction', 10, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in 2020 and operating $re$, $re$\1Operating $re$),
  ('introduction', 11, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in 2020 (?:in|on) $re$, $re$\1Based in $re$),
  ('introduction', 12, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in 2020 by a $re$, $re$\1Run by a $re$),
  ('introduction', 13, $re$(^|[.!?]\s+)(?:Established|Founded|Formed|Launched) in ((?:St[.] )?[A-Z][^,.;!?]{1,40}(?:, [A-Z][^,.;!?]{1,30})?),? in 2020, $re$, $re$\1Based in \2, $re$),
  ('introduction', 14, $re$(^|[.!?]\s+)(?:Since|(?:Established|Founded|Formed|Launched) in|(?:Since|From) (?:our |its )?(?:founding|establishment|inception|launching|launch|establishing|founding) in) 2020, $re$, $re$\1$re$),
  ('introduction', 15, $re$(?:established|founded|formed|launched) (?:in )?2020 in $re$, $re$based in $re$),
  ('introduction', 16, $re$(?:established|founded|formed|launched) in ((?:St[.] )?[A-Z][^,.;!?]{1,40}(?:, [A-Z][^,.;!?]{1,30})?),? in 2020$re$, $re$based in \1$re$),
  ('introduction', 17, $re$(?:established|founded|formed|launched) in 2020 and $re$, $re$$re$),
  ('introduction', 18, $re$,? and (?:established|founded|formed|launched) in 2020$re$, $re$$re$),
  ('introduction', 19, $re$(?:established|founded|formed|launched) in 2020 by a $re$, $re$run by a $re$),
  ('introduction', 20, $re$(was|were) (?:established|founded|formed|launched) in 2020 to $re$, $re$\1 set up to $re$),
  ('introduction', 21, $re$(was|were) (?:established|founded|formed|launched) in 2020 (with|as) $re$, $re$\1 set up \2 $re$),
  ('introduction', 22, $re$(^|[.!?]\s+)((?:[^,.!?]|[.](?=[^ ]))+), (?:established|founded|formed|launched) in 2020, $re$, $re$\1\2 $re$),
  ('introduction', 23, $re$, (?:established|founded|formed|launched) in 2020, $re$, $re$ $re$),
  ('introduction', 24, $re$, (?:established|founded|formed|launched) in 2020([.!?])$re$, $re$\1$re$),
  ('introduction', 25, $re$(was|were|is|been|being) ((?:established|founded|formed|launched)) in 2020$re$, $re$\1 \2 in 2O2O$re$),
  ('introduction', 26, $re$ (?:established|founded|formed|launched) in 2020$re$, $re$$re$),
  ('introduction', 27, $re$2O2O$re$, $re$2020$re$),
  ('introduction', 28, $re$(has|have), since 2020, $re$, $re$\1 $re$),
  ('introduction', 29, $re$, since 2020, (our|we) $re$, $re$, \1 $re$),
  ('introduction', 30, $re$, since 2020, $re$, $re$ $re$),
  ('introduction', 31, $re$ since 2020$re$, $re$$re$),
  ('introduction', 32, $re$,([.!?])$re$, $re$\1$re$),
  ('description', 1, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, the $re$, $re$\1The $re$),
  ('description', 2, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, it $re$, $re$\1It $re$),
  ('description', 3, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, we $re$, $re$\1We $re$),
  ('description', 4, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, we’ve $re$, $re$\1We’ve $re$),
  ('description', 5, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, we've $re$, $re$\1We've $re$),
  ('description', 6, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, they $re$, $re$\1They $re$),
  ('description', 7, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, our $re$, $re$\1Our $re$),
  ('description', 8, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020 and based $re$, $re$\1Based $re$),
  ('description', 9, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020 and headquartered $re$, $re$\1Headquartered $re$),
  ('description', 10, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020 and located $re$, $re$\1Located $re$),
  ('description', 11, $re$(^|[.!?]\s+)(?:Established|Founded) in 2020, (?=[A-Z])$re$, $re$\1$re$),
  ('description', 12, $re$(Established|Founded|established|founded) in 2020 by $re$, $re$\1 by $re$),
  ('description', 13, $re$, (?:established|founded) in 2020([.!?])$re$, $re$\1$re$),
  ('description', 14, $re$, (?:established|founded) in 2020 and $re$, $re$, $re$),
  ('description', 15, $re$, (?:established|founded) in 2020, $re$, $re$, $re$),
  ('description', 16, $re$(agency|firm|company|consultancy|business|specialist|partner|platform|provider|group|boutique|organisation|organization|start-?up|recruiter|practice|network) (?:established|founded) in 2020 and $re$, $re$\1 $re$),
  ('description', 17, $re$(agency|firm|company|consultancy|business|specialist|partner|platform|provider|group|boutique|organisation|organization|start-?up|recruiter|practice|network) (?:established|founded) in 2020(?=[,.]| that )$re$, $re$\1$re$),
  ('description', 18, $re$,([.!?])$re$, $re$\1$re$);

create function private.strip_founding_2020(input text, kind text)
returns text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  result text := input;
  rule record;
begin
  if input is null or position('2020' in input) = 0 then
    return input;
  end if;
  for rule in
    select r.pattern, r.replacement
    from private.text_cleaning_rules r
    where r.kind = strip_founding_2020.kind
    order by r.step
  loop
    result := regexp_replace(result, rule.pattern, rule.replacement, 'g');
  end loop;
  -- Introductions were machine-written around the false year, so a sentence
  -- that still ties a founding-type claim to 2020 is dropped whole.
  if kind = 'introduction' and position('2020' in result) > 0 then
    result := regexp_replace(result, $re$(^|[.!?]\s+)(?=[^.!?]*(?:[Ee]stablish|[Ff]ound|[Ll]aunch|[Ff]ormed|[Ii]ncept|[Oo]rigin|[Oo]pen|[Bb]egan|[Cc]ommenc|[Ss]tarted|[Ii]nitiat|Since|Seit|С 2020))[^.!?]*2020[^.!?]*(?:[.!?]+|$)\s*$re$, $re$\1$re$, 'g');
  end if;
  return result;
end
$fn$;
revoke all on function private.strip_founding_2020(text, text) from public, anon, authenticated;
