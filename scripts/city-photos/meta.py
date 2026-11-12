# Region labels and prompt tiers for the cities.
US = {
"New York":"New York","Chicago":"Illinois","Houston":"Texas","Dallas":"Texas","Atlanta":"Georgia","Los Angeles":"California","Austin":"Texas","San Francisco":"California","Boston":"Massachusetts","Miami":"Florida","Denver":"Colorado","Tampa":"Florida","Charlotte":"North Carolina","San Diego":"California","Phoenix":"Arizona","Orlando":"Florida","Scottsdale":"Arizona","Raleigh":"North Carolina","Minneapolis":"Minnesota","Pittsburgh":"Pennsylvania","Irvine":"California","San Antonio":"Texas","Alpharetta":"Georgia","Philadelphia":"Pennsylvania","Troy":"Michigan","Arlington":"Texas","Rochester":"Michigan","Richmond":"Virginia","Grand Rapids":"Michigan","San Jose":"California","Sacramento":"California","Fort Worth":"Texas","Naperville":"Illinois","Princeton":"New Jersey","Baltimore":"Maryland","Detroit":"Michigan","Santa Monica":"California","Cary":"North Carolina","Newport Beach":"California","Bethesda":"Maryland","Buffalo":"New York","Greensboro":"North Carolina","Reston":"Virginia","Aurora":"Colorado","Edison":"New Jersey","Jersey City":"New Jersey","Torrance":"California","Marietta":"Georgia","Miami Beach":"Florida","Orange":"California","Southfield":"Michigan","Beverly Hills":"California","Boulder":"Colorado","El Segundo":"California","Huntington Beach":"California","Oakland":"California","Ontario":"California","Rockville":"Maryland","Saint Paul":"Minnesota","Santa Clara":"California","Virginia Beach":"Virginia","Alexandria":"Virginia","Annapolis":"Maryland","Ashburn":"Virginia","Carlsbad":"California","Chandler":"Arizona","Fresno":"California","Sterling":"Virginia","Wilmington":"North Carolina","Woodbridge Township":"New Jersey","Fairfax":"Virginia","Allentown":"Pennsylvania","Asheville":"North Carolina","Columbia":"Maryland","Costa Mesa":"California","Dunwoody":"Georgia","El Paso":"Texas","Encinitas":"California","Glendale":"California","Greenwood Village":"Colorado","McLean":"Virginia","Mesa":"Arizona","Minnetonka":"Minnesota","Roswell":"Georgia","Tempe":"Arizona","Bakersfield":"California","Colorado Springs":"Colorado","Concord":"California","Duluth":"Georgia","Edina":"Minnesota","Farmington Hills":"Michigan","Littleton":"Colorado","Marina del Rey":"California","Palo Alto":"California","Parsippany-Troy Hills":"New Jersey","Pleasanton":"California","Roseville":"California","San Mateo":"California",
}
CA = {"Toronto":"Ontario","Vancouver":"British Columbia","Montreal":"Quebec","Mississauga":"Ontario","Calgary":"Alberta","Ottawa":"Ontario","Brampton":"Ontario","Edmonton":"Alberta","Oakville":"Ontario","Vaughan":"Ontario","Kitchener":"Ontario","Richmond Hill":"Ontario","Surrey":"British Columbia","Winnipeg":"Manitoba","Halifax":"Nova Scotia","Quebec City":"Quebec","Windsor":"Ontario","Burnaby":"British Columbia","Victoria":"British Columbia"}
AU = {"Sydney":"New South Wales","Melbourne":"Victoria","Brisbane":"Queensland","Perth":"Western Australia","Adelaide":"South Australia","Gold Coast":"Queensland","Sunshine Coast":"Queensland","Newcastle":"New South Wales"}
GB = {"Edinburgh":"Scotland","Glasgow":"Scotland","Aberdeen":"Scotland","Cardiff":"Wales"}
OTHER = {"Sandton":"Johannesburg","Randburg":"Johannesburg","Roodepoort":"Gauteng","Germiston":"Gauteng","Centurion":"Gauteng","Baar":"canton of Zug","Freienbach":"canton of Schwyz on Lake Zurich","Solna":"Stockholm County","Frederiksberg":"Copenhagen","Hoofddorp":"North Holland","Huizen":"North Holland","Ede":"Gelderland","Barneveld":"Gelderland","Drachten":"Friesland","Rijswijk":"South Holland","Navi Mumbai":"Maharashtra","Espoo":"Greater Helsinki","Vantaa":"Greater Helsinki"}
NAME_FIX = {"s-Hertogenbosch":"'s-Hertogenbosch (Den Bosch)","Washington, D.C.":"Washington, D.C."}

# Places with no single famous view: ask for a true-to-character local scene.
TOWNS = set("""Scottsdale|Irvine|Alpharetta|Brampton|Troy|Arlington|Randburg|Rochester|Navi Mumbai|Capelle aan den IJssel|Hoofddorp|Centurion|Almere|Naperville|Oakville|Vaughan|Cary|Newport Beach|Bethesda|Alphen aan den Rijn|Amstelveen|Reston|Aurora|Edison|Torrance|Hengelo|Marietta|Baar|Orange|Southfield|Kitchener|Vantaa|Espoo|Rijswijk|El Segundo|Ontario|Rockville|Santa Clara|Zoetermeer|Ashburn|Carlsbad|Chandler|Sterling|Woodbridge Township|Richmond Hill|Surrey|Solna|Freienbach|Fairfax|Drachten|Ede|Huizen|Costa Mesa|Dunwoody|Encinitas|Glendale|Greenwood Village|McLean|Mesa|Minnetonka|Roswell|Tempe|Burnaby|Frederiksberg|Barneveld|Venlo|Germiston|Roodepoort|Concord|Duluth|Edina|Farmington Hills|Littleton|Marina del Rey|Palo Alto|Parsippany-Troy Hills|Pleasanton|Roseville|San Mateo|Wayne|Columbia|Apeldoorn|Hilversum|Sunshine Coast""".split("|"))

TAIL = ("Golden hour daylight, soft clouds, rich natural colour, professional travel photography, sharp detail. "
        "Balanced wide composition with the main subject across the centre and right of the frame. "
        "No people in the foreground, no text, no signs, no logos, no watermark, no borders.")

def place(c):
    n = c["name"]; iso = c["country_iso2"]; country = c["country_name"]
    reg = None
    if iso == "US": reg = US.get(n)
    elif iso == "CA": reg = CA.get(n)
    elif iso == "AU": reg = AU.get(n)
    elif iso == "GB": reg = GB.get(n, "England")
    else: reg = OTHER.get(n)
    n = NAME_FIX.get(n, n)
    if n == "Wayne": return "Wayne, a leafy suburban town in the north-eastern United States"
    return f"{n}, {reg}, {country}" if reg else f"{n}, {country}"

def prompt(c, extra=None):
    p = place(c)
    if extra:
        body = extra
    elif c["name"] in TOWNS:
        body = ("An attractive, true-to-life view that people who live there would recognise: its downtown, "
                "main street or best-known local outlook, with the architecture, greenery and landscape of the "
                "region as they actually look. Avoid large areas of empty road or car park in the foreground, "
                "and do not borrow famous landmarks from other cities.")
    else:
        body = "Showing the city's most recognisable real view or skyline as it actually looks."
    return f"A photorealistic wide-angle photograph of {p}. {body} {TAIL}"
