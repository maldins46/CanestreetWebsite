-- ============================================================
-- Canestreet 3×3 — Historical content seed
-- Run this in the Supabase SQL editor AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- EDITIONS (oldest first)
-- ============================================================
-- NOTE: cover_url values point to the local Supabase Storage instance.
-- After deploying to production, update these URLs to the cloud Supabase
-- Storage URL (https://<project>.supabase.co/storage/v1/object/public/media/...)
-- via the admin panel or a follow-up migration.

-- Remove the placeholder inserted in 001
delete from editions where year = 2025 and title = 'Canestreet Summer 2025';

insert into editions (year, title, subtitle, description, winner_name, is_current, cover_url) values

(2018, 'La nostra prima volta', 'L''inizio di tutto',
'Era una torrida estate jesina, e il nostro CEO Michele Mosca, annoiato dalla piatta estate campagnola, viene colto da un''intuizione che si rivelerà provvidenziale: "e se mettessi su un torneo di basket estivo? Così a caso, per ride e per scherzà". È in questo modo, "per ride e per scherzà", che inizia il magico viaggio del torneo TheCanestreet. Il torneo si tenne nella location della Parrocchia San Sebastiano, di fronte casa di Michele. In concomitanza, fu organizzato il primo three-point contest "Qualcosa dal Carrello??" — utilizzando veri carrelli per raccogliere i palloni. Livelli altissimi già da allora.',
'Aleciotti da Tre Punti', false, 'http://127.0.0.1:54321/storage/v1/object/public/media/article1-scaled.jpeg'),

(2019, 'Moving to the SAMP', 'Entra nel circuito FISB',
'Il 2019 rappresentò un anno di svolta per il Canestreet. Il torneo, cresciuto in termini di partecipazione e visibilità, si trasferì al SAMP, una location più ampia e adatta a ospitare un numero maggiore di squadre e spettatori. L''ingresso nel circuito FISB 3×3 fu un passo fondamentale, permettendo ai vincitori di guadagnare punti utili per il ranking nazionale e di qualificarsi per tornei di livello superiore. Questo riconoscimento ufficiale confermò il valore del Canestreet come evento di riferimento per il basket 3×3 nelle Marche.',
null, false, 'http://127.0.0.1:54321/storage/v1/object/public/media/article2-scaled.jpeg'),

(2021, 'Let''s Start Going Big', 'Entra nel circuito FIP',
'Dopo la pausa forzata del 2020 a causa della pandemia, il Canestreet tornò nel 2021 con rinnovato vigore e ambizione. L''edizione di quell''anno segnò un''importante crescita, con l''ingresso nel circuito FIP 3×3, che consentì ai vincitori di accedere direttamente alle finali nazionali. Questo passo rappresentò una conferma del valore del torneo e della sua capacità di attrarre giocatori di livello sempre più elevato. Nonostante le sfide logistiche imposte dalle restrizioni sanitarie, gli organizzatori riuscirono a garantire un evento sicuro e di qualità. L''edizione 2021 consolidò il Canestreet come un appuntamento imperdibile per gli appassionati di basket 3×3.',
null, false, 'http://127.0.0.1:54321/storage/v1/object/public/media/article3-scaled.jpeg'),

(2022, 'L''anno degli under', 'Nasce il torneo under',
'Il 2022 fu l''anno dell''inclusione e della crescita per il Canestreet. Con l''introduzione delle categorie Under 14, 16 e 18, il torneo si aprì ai giovani talenti, offrendo loro l''opportunità di confrontarsi in un ambiente competitivo e stimolante. Per la prima volta, non uno, ma ben due tornei vennero organizzati negli stessi giorni. La categoria Under 16, in particolare, riscosse un grande successo, attirando numerosi partecipanti. Questa edizione rappresentò un passo importante nella storia del Canestreet, consolidando il torneo come un punto di riferimento per il basket giovanile 3×3.',
null, false, 'http://127.0.0.1:54321/storage/v1/object/public/media/edition1.jpg'),

(2023, 'Il torneo treeeeplo', 'Oltre 500 partecipanti',
'Anno 2023: l''anno nel quale gli organizzatori del Canestreet hanno fatto gli straordinari. Non uno, non due, ma ben tre tornei Under sono stati organizzati in questa edizione: Under 14, Under 16 e Under 18, in aggiunta al torneo Senior, per un totale di più di 500 partecipanti effettivi! Con l''introduzione simultanea di tutte le categorie, il torneo raggiunse un record assoluto di partecipazione, confermandosi come uno degli eventi di basket 3×3 più importanti d''Italia. Oltre alle competizioni, furono organizzate attività collaterali, come il 3-point contest "Qualcosa dal Carrello" e il torneo amatoriale "Qualcosa dal Cestello".',
null, false, 'http://127.0.0.1:54321/storage/v1/object/public/media/edition3-scaled.jpeg'),

(2024, 'Nel cuore di Jesi', 'Piazza della Repubblica',
'Nel 2024, il Canestreet fece ritorno alle sue radici, scegliendo come location Piazza della Repubblica, nel cuore di Jesi. Questa scelta simbolica rappresentò un omaggio alla città che aveva visto nascere il torneo e un modo per rafforzare il legame con la comunità locale. Il campo modulare allestito nella piazza divenne il palcoscenico di quattro giorni di sport, musica e divertimento, con partite che si svolsero dalle 15:00 alle 23:50. L''edizione 2024 vide anche l''introduzione di un premio in denaro per la squadra vincitrice del torneo senior, un segno tangibile della crescita e della professionalizzazione del torneo.',
null, false, 'http://127.0.0.1:54321/storage/v1/object/public/media/edition2.jpg'),

(2025, 'Facciamo sul serio', 'Piazza della Repubblica — palco e gradinate',
'Nel 2025 abbiamo dato vita al nostro torneo più grande: ancora in Piazza della Repubblica, ancora tante edizioni under (record partecipazione under a livello marchigiano), e un super palco con gradinate a ricordare i grandi tornei di Jesi del passato. Ruling the piazza, ancora una volta.',
null, true, 'http://127.0.0.1:54321/storage/v1/object/public/media/cover-2025.jpg');

-- ============================================================
-- NEWS ARTICLES
-- ============================================================

-- Note: author_id is left null (no admin user seeded here).
-- Set published = true so articles are publicly visible.

insert into news (title, slug, excerpt, body, cover_url, published, published_at) values

(
  'TheCanestreet 2018: la nostra prima volta',
  'thecanestreet-2018-la-nostra-prima-volta',
  'Era una torrida estate jesina, e il nostro CEO Michele Mosca viene colto da un''intuizione che si rivelerà provvidenziale: "e se mettessi su un torneo di basket estivo?"',
  E'Era una torrida estate jesina, e il nostro CEO Michele Mosca, annoiato dalla piatta estate campagnola, viene colto da un''intuizione che si rivelerà provvidenziale: "e se mettessi su un torneo di basket estivo? Così a caso, per ride e per scherzà".\n\nÈ in questo modo, "per ride e per scherzà", che inizia il magico viaggio del torneo TheCanestreet. È così che il nostro eroe inizia a guardarsi intorno, e mette insieme il suo team personale di Avengers del basket dilettantistico. Insieme a Michele, nel primo anno di attività il CaneStaff comprendeva Federico Rossetti, Lorenzo Fava, Giorgia Barchiesi e Riccardo Maldini.\n\nÈ così che dal nulla iniziammo a metter su una pagina Instagram, parlarne con altri colleghi cestisti e spargere la voce. Ed è così che nel mezzo dell''estate 2018 iniziò la prima edizione, nella location della Parrocchia San Sebastiano (non a caso, di fronte casa di Michele).\n\nIn concomitanza al torneo, la mente malata degli organizzatori partorì l''idea di giocare un three-point Contest, che passò alla storia come "Qualcosa dal carrello??" (riferimenti a parodie di film famosi completamente casuali). Cosa molto divertente di questo contest, è che effettivamente utilizzammo dei veri carrelli per raccogliere i palloni da basket. Livelli altissimi già da allora.\n\n## Albo d''oro 2018\n\nL''edizione 2018 fu espugnata dalla squadra degli **Aleciotti da Tre Punti**, composta da Matteo Sebastianelli, Federico Rossetti, Samuele Schiavoni e Samuele Moretti.\n\nPrimo vincitore di Qualcosa dal Carrello fu invece Tommaso Martellini, che si portò a casa uno dei trofei più seri che abbiamo avuto nelle varie edizioni del Canestreet.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/article1-scaled.jpeg',
  true, '2022-05-16 14:23:00+00'
),

(
  'TheCanestreet 2019: moving to the SAMP',
  'thecanestreet-2019-moving-to-the-samp',
  'Il 2019 rappresentò un anno di svolta per il Canestreet: nuova location al SAMP e ingresso nel circuito FISB 3×3.',
  E'Il 2019 rappresentò un anno di svolta per il Canestreet. Il torneo, cresciuto in termini di partecipazione e visibilità, si trasferì al SAMP, una location più ampia e adatta a ospitare un numero maggiore di squadre e spettatori. Questo cambiamento non fu solo logistico, ma segnò anche un''evoluzione nell''organizzazione dell''evento, che iniziò a strutturarsi in modo più professionale.\n\nL''ingresso nel circuito FISB 3×3 fu un passo fondamentale, permettendo ai vincitori di guadagnare punti utili per il ranking nazionale e di qualificarsi per tornei di livello superiore. Questo riconoscimento ufficiale confermò il valore del Canestreet come evento di riferimento per il basket 3×3 nelle Marche e contribuì ad aumentare la partecipazione e l''interesse attorno al torneo.\n\nIl successo di questa edizione fu testimoniato dall''entusiasmo dei partecipanti e dalla crescente affluenza di pubblico, che apprezzò l''organizzazione curata e l''atmosfera coinvolgente che caratterizzarono l''evento.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/article2-scaled.jpeg',
  true, '2022-05-17 14:28:00+00'
),

(
  'TheCanestreet 2021: Let''s Start Going Big',
  'thecanestreet-2021-lets-start-going-big',
  'Dopo la pausa forzata del 2020, il Canestreet tornò nel 2021 con rinnovato vigore e un traguardo storico: l''ingresso nel circuito FIP.',
  E'Dopo la pausa forzata del 2020 a causa della pandemia, il Canestreet tornò nel 2021 con rinnovato vigore e ambizione. L''edizione di quell''anno segnò un''importante crescita, con l''ingresso nel circuito FIP 3×3, che consentì ai vincitori di accedere direttamente alle finali nazionali.\n\nQuesto passo rappresentò una conferma del valore del torneo e della sua capacità di attrarre giocatori di livello sempre più elevato. Nonostante le sfide logistiche e organizzative imposte dalle restrizioni sanitarie, gli organizzatori riuscirono a garantire un evento sicuro e di qualità, rispettando tutte le normative vigenti.\n\nLa partecipazione fu numerosa, con squadre provenienti da diverse regioni d''Italia, e l''atmosfera di festa e competizione che aveva contraddistinto le edizioni precedenti fu mantenuta intatta. L''edizione 2021 consolidò il Canestreet come un appuntamento imperdibile per gli appassionati di basket 3×3, dimostrando la resilienza e la passione di una comunità che non si è mai fermata.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/article3-scaled.jpeg',
  true, '2022-05-18 14:29:00+00'
),

(
  'TheCanestreet 2022: l''anno degli under',
  'thecanestreet-2022-lanno-degli-under',
  'Il 2022 fu l''anno dell''inclusione e della crescita: per la prima volta categorie Under 14, 16 e 18 affiancano il torneo Senior.',
  E'Il 2022 fu l''anno dell''inclusione e della crescita per il Canestreet. Con l''introduzione delle categorie Under 14, 16 e 18, il torneo si aprì ai giovani talenti, offrendo loro l''opportunità di confrontarsi in un ambiente competitivo e stimolante. Questa scelta rispecchiò l''impegno degli organizzatori nel promuovere il basket 3×3 anche tra le nuove generazioni, favorendo la crescita del movimento a livello locale e nazionale.\n\nLa categoria Under 16, in particolare, riscosse un grande successo, attirando numerosi partecipanti e suscitando l''interesse di allenatori e scout. L''organizzazione si impegnò a garantire un''esperienza di qualità per tutti i partecipanti, curando ogni dettaglio e assicurando che le partite si svolgessero in un clima di fair play e rispetto reciproco.\n\nQuesta edizione rappresentò un passo importante nella storia del Canestreet, consolidando il torneo come un punto di riferimento per il basket giovanile 3×3 e gettando le basi per future collaborazioni con le scuole e le società sportive del territorio.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/article4-scaled.jpeg',
  true, '2023-02-26 17:28:00+00'
),

(
  'Nuovo logo, stesse facce',
  'nuovo-logo-stesse-facce',
  'Il Canestreet cambia logo, piazzandoci un bel leone, così de botto, per ricordarci sempre de dove semo.',
  E'Il Canestreet cambia logo, piazzandoci un bel leone, così de botto, per ricordarci sempre de dove semo ✨\n\nEd è solo l''inizio…',
  null,
  true, '2024-05-25 17:20:00+00'
),

(
  'Svelata la location dell''edizione 2024',
  'svelata-la-location-delledizione-2024',
  'Droppiamo il sipario sulla prima vera grande news di quest''anno: la LOCHESCCCION.',
  E'Droppiamo il sipario sulla prima vera grande news di quest''anno: la LOCHESCCCION.\n\nIl torneo più importante di Jesi meritava una casa importante, e l''ha trovata:\n\n## L''APPUNTAMENTO QUESTA ESTATE È IN PIAZZA DELLA REPUBBLICA 🏀🦁\n\nNon vediamo l''ora di vedere del buon giuoco del basket sotto l''obelisco ❣️\n\nE non finisce qua: c''è ancora tanto tanto altro che dovete scoprire. Parola d''ordine: #lasciatecucinaremichele',
  'http://127.0.0.1:54321/storage/v1/object/public/media/edition2.jpg',
  true, '2024-05-25 17:24:00+00'
),

(
  'Edizione 2024: nel cuore di Jesi',
  'edizione-2024-nel-cuore-di-jesi',
  'Nel 2024, il Canestreet fece ritorno alle sue radici, scegliendo come location Piazza della Repubblica, nel cuore di Jesi.',
  E'Nel 2024, il Canestreet fece ritorno alle sue radici, scegliendo come location Piazza della Repubblica, nel cuore di Jesi. Questa scelta simbolica rappresentò un omaggio alla città che aveva visto nascere il torneo e un modo per rafforzare il legame con la comunità locale.\n\nIl campo modulare allestito nella piazza divenne il palcoscenico di quattro giorni di sport, musica e divertimento, con partite che si svolsero dalle 15:00 alle 23:50 circa.\n\nL''edizione 2024 vide l''introduzione di un premio in denaro per la squadra vincitrice del torneo senior, un segno tangibile della crescita e della professionalizzazione del torneo. Le categorie Under 14, 16 e 18 continuarono a rappresentare il cuore pulsante dell''evento, con giovani talenti che si sfidarono in un clima di sana competizione.\n\nL''atmosfera festosa e l''afflusso di pubblico dimostrarono ancora una volta la forza di un evento che, partito da un''idea semplice, era riuscito a diventare un appuntamento imperdibile per gli appassionati di basket e per la città di Jesi.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/edition2.jpg',
  true, '2024-05-25 17:33:00+00'
),

(
  'Canestreet 2025 – Ci vediamo in piazza!',
  'canestreet-2025-ci-vediamo-in-piazza',
  'Jesi, 15-18 luglio. Quattro giorni. Un playground sotto le stelle. Canestreet torna. E lo fa col botto.',
  E'Jesi, 15-18 luglio. Quattro giorni. Un playground sotto le stelle. Il ritmo del pallone che rimbalza sull''asfalto. Il suono delle scarpe che graffiano il campo. L''energia di chi vive il basket come uno stile di vita.\n\n**Canestreet torna. E lo fa col botto.**\n\nOgni estate c''è un momento che aspettiamo tutto l''anno. Quel momento è arrivato. Dal 15 al 18 luglio, Piazza della Repubblica di Jesi si trasforma nel cuore pulsante del basket 3×3. Torna CANESTREET, il torneo ufficiale FIP & LB3 che da anni unisce gioco, passione e comunità in un evento unico.\n\nCi sarà il miglior streetball d''Italia, in un contesto spettacolare, con squadre da tutta la regione (e oltre) pronte a darsi battaglia. Dalle categorie Under ai Senior, ogni fascia d''età avrà il suo spazio, per quattro giorni intensi tra sport, adrenalina e amicizia.\n\nE poi ci saranno le finali: energia pura, musica, luci e un pubblico infuocato. Un''atmosfera che non si può spiegare. Si vive.\n\n**Le iscrizioni sono ufficialmente aperte:** vai su canestreet.it e clicca sulla sezione ISCRIZIONI per compilare il modulo e garantirti il posto. Ma muoviti: i posti sono limitati e, come ogni anno, andranno via in fretta.\n\nQui non è solo un torneo, è una chiamata a raccolta per tutti quelli che vivono il basket come una seconda pelle. Per non perderti nemmeno un''azione, uno scatto o un dietro le quinte, segui **@canestreet3x3** su Instagram.\n\nChi ha vissuto almeno una sera d''estate a bordo campo lo sa: Canestreet è molto più di basket. È vibrazione, rispetto, fatica, festa. È la voce dei tuoi amici che ti incita, è quel fadeaway allo scadere, è il cuore che batte forte sotto la maglia. È il nostro modo di stare insieme.\n\n**Ci vediamo in campo. 15–18 luglio. Jesi. Canestreet 2025.**\n\nSe sai, sai.\n\n#Canestreet2025 #BallDontLie #StreetballVibes #JesiIsBallin',
  'http://127.0.0.1:54321/storage/v1/object/public/media/Breaking-news.png',
  true, '2025-06-16 21:14:00+00'
),

(
  'Edizione 2023: il torneo treeeeplo',
  'edizione-2023-il-torneo-treeeeplo',
  'Il 2023 fu l''anno della massima espansione: con 4 categorie simultanee il Canestreet raggiunge un record di oltre 500 partecipanti.',
  E'Il 2023 fu l''anno della massima espansione per il Canestreet. Con l''introduzione simultanea delle categorie Under 14, 16, 18 e Senior, il torneo raggiunse un record di oltre 500 partecipanti, confermandosi come uno degli eventi di basket 3×3 più importanti d''Italia.\n\nL''organizzazione dovette affrontare sfide logistiche significative per gestire un numero così elevato di squadre, ma la risposta della comunità fu entusiasta e partecipativa.\n\nOltre alle competizioni, furono organizzate attività collaterali, come il 3-point contest "Qualcosa dal Carrello" e il torneo amatoriale "Qualcosa dal Cestello", che arricchirono l''esperienza dei partecipanti e degli spettatori.\n\nIl successo dell''edizione 2023 fu testimoniato anche dall''interesse crescente dei media e dalla partecipazione di sponsor locali e nazionali, che riconobbero nel Canestreet un''opportunità per promuovere il proprio brand in un contesto dinamico e giovane.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/article5-scaled.jpeg',
  true, '2024-05-25 17:15:00+00'
),

(
  'Edizione 2025: Facciamo sul serio',
  'edizione-2025-famo-sul-serio',
  'Nel 2025 abbiamo dato vita al nostro torneo più grande: record partecipazione under a livello marchigiano e un super palco con gradinate.',
  E'Nel 2025 abbiamo dato vita al nostro torneo più grande: ancora in Piazza della Repubblica, ancora tante edizioni under (record partecipazione under a livello marchigiano), e un super palco con gradinate a ricordare i grandi tornei di Jesi del passato.\n\nRuling the piazza, ancora una volta.',
  'http://127.0.0.1:54321/storage/v1/object/public/media/cover-2025.jpg',
  true, '2025-08-29 15:54:00+00'
);
