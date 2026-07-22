## ADDED Requirements

### Requirement: Brand mark derives from the new blue logo asset

The visual brand mark SHALL derive from a single new blue logo asset committed to the repository. The on-screen `Logotype` glyph, the Next 16 file-based favicon set (`app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`), and the Open Graph image SHALL all reflect this one blue asset. The logotype's brand tile/glyph SHALL render in the blue brand color (inherited from the blue `--pitch`/`--primary` token), not the previous green.

#### Scenario: Logotype tile is blue
- **WHEN** `<Logotype />` is rendered at any size
- **THEN** its brand tile/glyph renders in the blue brand color, not green

#### Scenario: Favicon and OG reflect the blue mark
- **WHEN** `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`, and the OG image are inspected after the change lands
- **THEN** each reflects the new blue logo asset

### Requirement: Global footer omits the host-nations tagline

The global site footer SHALL NOT render the host-nations tagline "USA · Canada · Mexico". The `footer.hosts` i18n key SHALL be removed from every locale message file so no dead translation key remains.

#### Scenario: Footer has no host tagline
- **WHEN** the global footer (`SiteFooter`) is rendered
- **THEN** it does not contain the "USA · Canada · Mexico" host-nations text

#### Scenario: No dead hosts i18n key
- **WHEN** the locale message files (`messages/en.json`, `messages/de.json`, `messages/fr.json`, and `messages/es.json` if present) are inspected
- **THEN** none contains a `footer.hosts` key
