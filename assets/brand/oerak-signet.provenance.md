# Provenienz

Bildmarke des Österreichischen Rechtsanwaltskammertags, Fremdmarke.

- Quelle: `https://www.oerak.at/typo3conf/ext/baseprovider_rechtsanwaelte/Resources/Public/Images/oerak_logo.svg`,
  geladen am 7. September 2026 auf Wunsch von Alfred.
- Aus der Vorlage stammt ausschließlich der rote Pfad, also das Zeichen. Der
  Schriftzug "Österreichischer Rechtsanwaltskammertag" ist nicht übernommen.
- Die Vorlage legt den Innenraum des Zeichens als zweiten Unterpfad an und
  deckt ihn mit einem weißen Pfad darüber ab. Hier steht stattdessen
  `fill-rule="evenodd"`, damit der Innenraum ein echtes Loch ist und der
  Hintergrund durchscheint. Das ist Bedingung für die dunkle Fußzeile.
- Die `viewBox` ist auf die Umrisse des Zeichens beschnitten
  (`19.74 17.85 143.92 186.45`), damit es ohne Rand ausgerichtet werden kann.
- Die Form ist unverändert. Kein Nachzeichnen, keine Rundungen, keine
  Vereinfachung der Kontur.
- Die Fläche ist `currentColor`. Auf der Seite wird die Kontur als Maske
  eingesetzt, siehe `.footer-kammer::before` in `styles.css`. Diese Datei ist
  die Quelle, ausgeliefert wird sie nicht: die Regel trägt dieselbe Kontur als
  `data:`-URI, weil ein Verweis auf eine Datei über `file://` von Chrome als
  fremde Herkunft blockiert wird. Eine Änderung an der Kontur muss deshalb an
  beiden Stellen ankommen. In der Fußzeile erscheint das
  Zeichen deshalb einfarbig im Ton der Zeile, nicht im offiziellen Rot
  `#e30613`; das Rot erreicht auf dem Navy der Fußzeile nur 2,5:1.
- Verwendung: Hinweis auf die Kammermitgliedschaft von Mag. Elisabeth Zick.
  Die Marke gehört dem Österreichischen Rechtsanwaltskammertag, nicht der
  Kanzlei. Sollte der ÖRAK der Verwendung widersprechen, genügt es, die Regel
  `.footer-kammer::before` zu entfernen; das Markup der Seiten bleibt unberührt.
