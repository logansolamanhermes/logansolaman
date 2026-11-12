"""Buyer-facing scope notes for the 17 case studies.

Grounded strictly in the existing case copy (locales/en.json), the CASES
metadata in assets/js/site.js, and the visible screenshots. Nothing here
invents metrics, client quotes, dates or outcomes. Each note describes the
constraint visible in the work and the architectural response to it.

Keep in sync with CASES when case metadata changes.
"""

# k -> (constraint, what was built, evidence a buyer can check)
SCOPE = {
    1:  ("A full sling-and-backpack catalog with durability specs and comfort claims that have to survive a commuter's buying decision",
         "HK flagship for the complete line, with product detail built around technical specs and a checkout tuned for conversion",
         "Desktop + mobile homepage captures; live store linked"),
    2:  ("Precision instruments whose brand standard has to hold in a localised market",
         "Official Hong Kong storefront engineered to the same standard as the hardware: localised catalog, clean product hierarchy",
         "Desktop + mobile homepage captures; live store linked"),
    3:  ("A playful Seattle outdoor brand whose voice disappears if translation is literal",
         "Full apparel line localised for Hong Kong with tone preserved and the commerce system kept serious underneath",
         "Desktop + mobile homepage captures; live store linked"),
    4:  ("A Japanese camp brand's first push into the Hong Kong market",
         "Hong Kong storefront currently under construction on Shopify",
         "No live site yet — placeholder, not a real screenshot"),
    5:  ("Alpine-grade technical kit whose spec density needs a commerce system worthy of the fabric",
         "Hong Kong storefront currently under construction on Shopify",
         "No live site yet — placeholder, not a real screenshot"),
    6:  ("A global watch brand needing limited-edition theatre, multi-currency checkout and multilingual routing",
         "Global flagship with product theatre for limited editions, multi-currency and language routing",
         "Desktop + mobile homepage captures; live store linked"),
    7:  ("Couture-level brand weight that still has to load fast",
         "Storefront carrying the brand's editorial weight while keeping page weight under control",
         "Desktop + mobile homepage captures; live store linked"),
    8:  ("A white-wall gallery where the artworks must be the loudest element on the page",
         "Museum-grade storefront with an image-first archive and a two-step collecting decision",
         "Desktop + mobile homepage captures; live store linked"),
    9:  ("A wine catalog deep enough to overwhelm a buyer",
         "Region-by-region navigation architecture across four locales, one cellar",
         "Desktop + mobile homepage captures; live store linked"),
    10: ("Physical racks and a digital cart sharing one inventory truth",
         "Online-to-offline system: memberships, payments, delivery and a single inventory brain",
         "Desktop + mobile homepage captures; live store linked"),
    11: ("A thousand SKUs across gadgets, wallets, backpacks and electronics with no coherent structure",
         "Catalog restructure, logistics wiring and technical SEO for steady organic intake",
         "Desktop + mobile homepage captures; live store linked"),
    12: ("Proxy-buying across four countries where the real product is certainty, not the item",
         "Trust machinery: sourcing, shipping tiers and a storefront that sells authenticity",
         "Desktop + mobile homepage captures; live store linked"),
    13: ("Parents choosing one-to-one or small-group tuition need reassurance in one scroll",
         "Commerce infrastructure for bookings with a storefront that reassures before it asks",
         "Desktop + mobile homepage captures; live store linked"),
    14: ("One catalog selling into Taiwan, Canada and the US without checkout friction",
         "Global storefront with multi-currency routing across three markets",
         "Desktop + mobile homepage captures; live store linked"),
    15: ("Counter sales and inventory drifting out of sync at checkout speed",
         "Custom point-of-sale system syncing counter transactions with inventory — an internal system, not a storefront",
         "Internal system; no public URL or screenshot"),
    16: ("A lifetime of paintings and exhibitions that should lead, not compete with UI",
         "Quiet, image-first archive for an artist's work and exhibition history",
         "Desktop + mobile homepage captures; live store linked"),
    17: ("An urgent pest problem where the visitor needs confidence before they call",
         "Service system with education-first content and clear booking paths",
         "Desktop + mobile homepage captures; live store linked"),
}


def note(k):
    return SCOPE[k]
