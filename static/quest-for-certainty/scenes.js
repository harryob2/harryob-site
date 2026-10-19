/* Scene script for "Escape from Peril".
 *
 * Everything that happens on the stage is anchored to a phrase in the essay.
 * `at` is the first few words of the moment (matched against the narration's
 * word timings), so a scene or a single stroke appears exactly when it is said.
 * Inside a scene, any element with class "c" waits for its own data-at phrase
 * (searched from the scene's start), or data-d seconds after the scene begins.
 */
(function () {
  const V = 'viewBox="0 0 1200 900"';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // cue attributes
  function cue(o) {
    let a = '';
    if (o.at) a += ` data-at="${esc(o.at)}"`;
    if (o.d != null) a += ` data-d="${o.d}"`;
    if (o.u) a += ` data-until="${esc(o.u)}"`;
    if (o.tip) a += ` data-tip="${esc(o.tip)}"`;
    return a;
  }
  function wrap(str, n) {
    if (!n) return [str];
    const out = []; let line = '';
    for (const w of str.split(' ')) {
      if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
    }
    if (line) out.push(line);
    return out;
  }
  // text
  function T(x, y, str, o = {}) {
    const lines = wrap(str, o.w);
    const lh = o.lh || 1.12;
    const size = o.s || 40;
    const y0 = o.vc ? y - ((lines.length - 1) * size * lh) / 2 : y;
    const spans = lines.map((l, i) => `<tspan x="${x}" ${i ? `dy="${lh}em"` : `y="${y0}"`}>${esc(l).replace(/\*(.+?)\*/g, '<tspan font-style="italic">$1</tspan>')}</tspan>`).join('');
    const st = (o.fill ? `fill:${o.fill};` : '') + (o.style || '');
    const extra = st ? ` style="${st}"` : '';
    const fill = '';
    const cl = o.raw ? `${o.f || 'hand'} ${o.cls || ''}` : `c ${o.a || 'up'} ${o.f || 'hand'} ${o.cls || ''}`;
    return `<text class="${cl}" font-size="${size}" text-anchor="${o.anc || 'middle'}"${fill}${extra}${cue(o)}>${spans}</text>`;
  }
  // path (drawn)
  function P(d, o = {}) {
    const anim = o.a || (/\bflow\b/.test(o.cls || '') ? 'fa' : 'dr');
    return `<path d="${d}" pathLength="1" class="c ${anim} ink ${o.cls || ''}"${o.arrow ? ' marker-end="url(#ah)"' : ''}${o.arrow2 ? ' marker-start="url(#ah)"' : ''}${o.sw ? ` stroke-width="${o.sw}"` : ''}${cue(o)}/>`;
  }
  // arrow from a to b with optional bend
  function A(x1, y1, x2, y2, o = {}) {
    const b = o.bend || 0;
    const mx = (x1 + x2) / 2 - (y2 - y1) * b, my = (y1 + y2) / 2 + (x2 - x1) * b;
    return P(`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, Object.assign({ arrow: true }, o));
  }
  // watercolour wash blob
  function W(cx, cy, rx, ry, color, o = {}) {
    if (o.raw) return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" filter="url(#wash)" opacity="${o.o || 0.5}"/>`;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" filter="url(#wash)" class="c ${o.a || 'wa'} ${o.cls || ''}" style="--o:${o.o || 0.5}"${cue(o)}/>`;
  }
  // paper box
  function B(x, y, w, h, o = {}) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r || 14}" class="c ${o.a || 'fa'} paperbox ${o.cls || ''}" filter="url(#rough)"${o.sw ? ` stroke-width="${o.sw}"` : ''}${cue(o)}/>`;
  }
  function G(inner, o = {}) {
    return `<g class="c ${o.a || 'fa'} ${o.cls || ''}"${o.style ? ` style="${o.style}"` : ''}${cue(o)}>${inner}</g>`;
  }
  const svg = (...parts) => `<svg ${V} preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;

  // deterministic noise for scatter
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return u - 3; };

  const IND = '#3a62a8', SIE = '#c0612f', OCH = '#c9a13b', INK = '#2b2620', SAGE = '#6f8a62';

  /* ────────────────────────────── Movements ────────────────────────────── */
  const movements = [
    { n: 'I', title: 'Two Roads to Security', at: 'Man who lives in a world of hazards',
      gloss: 'Dewey opens with an anthropology of fear. In a world of hazards people have pursued security in two ways: by <em>changing the self</em> (appeasing the powers that rule their fate, first with sacrifice and later with inward devotion and resignation) or by <em>changing the world</em> through the arts of shelter, clothing, fire and social life. He points out an irony: the method that actually delivered security has usually been suspected of impious pride.' },
    { n: 'II', title: 'The Disesteem of Practice', at: 'Men have been glad enough to enjoy',
      gloss: 'We enjoy what the arts produce, but we distrust them as a way of facing life’s serious perils. Philosophers prize a change of ideas and religious teachers a change of heart, and action counts only as evidence of the inner change. Dewey lists the usual explanations for this ranking: work is a curse, it was left to slaves, thought requires leisure, and matter is base. He presents them as accompaniments of the prejudice, not its explanation.' },
    { n: 'III', title: 'Why This Invidious Discrimination?', at: 'One might continue in this strain',
      gloss: 'Here Dewey moves from description to diagnosis. Social caste and disgust may <em>cause</em> a belief, but they do not <em>justify</em> it. He then sets out the programme of the whole book as a string of questions, and states his answer in advance: the exaltation of pure intellect goes together with a quest for certainty that is absolute and unshakeable.' },
    { n: 'IV', title: 'Act, but Act at Your Peril', at: 'Practical activity deals with individualized',
      gloss: 'Action is risky because every practical situation is unique and changing, and we are caught up in it ourselves. The intellect, on the traditional view, grasps universal and unchanging Being. Dewey then gathers the commonplaces of human frustration: the best-laid plans “gang agley” (Burns), and the more important the matter, the greater the say of forces we do not control.' },
    { n: 'V', title: 'Safety First', at: 'Hence men have longed to find a realm',
      gloss: 'So people longed for an activity with no external consequences, and found it in pure thinking. On the classical view the mind is complete and self-sufficient, so failure can always be blamed on an “alien, intractable and inferior” world outside it. The practical arts give only relative and incomplete security, and every new art brings new dangers. The key line in this movement is that what we dislike is not uncertainty itself but the threat of evil that comes with it.' },
    { n: 'VI', title: 'Learning to Play with Danger', at: 'While the tradition has, as we shall see',
      gloss: 'Dewey proposes a thought experiment. Strip modern Western people of their inherited beliefs, and they would probably not look down on practice, because technology, insurance and many protective arts have given them a sense that fortune is passing into their own hands. He cites the changing position of women as a sign that protection is no longer valued for its own sake. The fears left by the Great War are the one exception he makes.' },
    { n: 'VII', title: 'A World Without Defences', at: 'This suggestion is speculative',
      gloss: 'The speculation is there to provide a contrast. Early humans had no tools, no foresight and no defences, so good and evil arrived as the gifts and blows of uncontrollable powers. Any object that happened to be present at a triumph or a disaster became an omen. Like a drowning man grasping at a straw, they spent on rites and magic the care we now spend on skills and machines. As Dewey puts it, “this atmosphere <em>was</em> the religious disposition.”' },
    { n: 'VIII', title: 'Ritual Beside Skill', at: 'Search for alliance with means',
      gloss: 'Even everyday crafts such as making a weapon, shaping a bowl or sowing seed were accompanied by ritual acts “different in kind” from the technical skill, performed to make sure the work succeeded. Dewey also warns that “supernatural” is an anachronism, since no defined realm of “nature” existed yet. The real line ran between the ordinary and the extraordinary, with a vague no-man’s land between them from which the extraordinary could break in at any moment.' },
    { n: 'IX', title: 'The Holy and the Lucky', at: 'The two dominant conceptions, cultural categories',
      gloss: 'Two categories grew out of this soil: the holy and the fortunate, with their opposites, the profane and the unlucky. The holy is powerful, contagious and ambivalent, and must be approached with scruple and submission; it says <em>Noli me tangere</em>, “touch me not”. The lucky charm, by contrast, is concrete and can be handled: coaxed, coerced, scolded or thrown away. The result is a rhythm of submission and domination.' },
    { n: 'X', title: 'The Fundamental Dualism', at: 'Such statements give, of course, a one-sided picture',
      gloss: 'Dewey qualifies the picture: people always had practical skills and matter-of-fact knowledge. But that knowledge lacked glamour. We feel on a level with what is familiar and below what inspires awe. Here, he says, is “the source of the fundamental dualism”: a lower realm in which we foresee and control, and a higher realm of powers beyond our control.' },
    { n: 'XI', title: 'Philosophy Inherits Religion', at: 'The philosophical tradition regarding knowledge and practice',
      gloss: 'The classical dualism in philosophy was not original. It gave rational form to this older cultural division. Philosophy took over the higher realm from religion and changed its form, from emotional story to logical argument, while keeping its content. Aristotle’s “First Philosophy” (metaphysics) sounds coolly analytical, but he identifies it with theology: its objects are divine, eternal and self-sufficient. Philosophy stripped away the myths about the heavenly bodies but kept the core belief that the divine encompasses nature.' },
    { n: 'XII', title: 'Euclid’s Clew', at: 'The geometry of Euclid doubtless gave',
      gloss: 'Geometry seemed to offer a science that owed nothing to the senses beyond the figures used to illustrate it: a world of ideal forms joined by eternal, necessary relations that reason alone could trace. Philosophy generalised this into a realm of fixed Being. Read as an anthropologist would read it, the work of Plato and Aristotle systematised and purified Greek religious and artistic belief, and left two lasting gifts: the ideal of science and the ideal of a life of reason.' },
    { n: 'XIII', title: 'The Price of the Gift', at: 'But with all our gratitude for these enduring gifts',
      gloss: 'The gifts came at a cost. They brought a higher realm of fixed reality, the only possible object of true science, and a lower world of change where experience and practice belong. The job of knowledge became to “uncover the antecedently real” instead of understanding problems in order to deal with them. Deliverance by rites gave way to deliverance by reason, but it was still an escape rather than an active coping with conditions.' },
    { n: 'XIV', title: 'Activity and Action, Knowledge and Belief', at: 'The realms of knowledge and action were each divided',
      gloss: 'Knowledge and action are each split in two. Greek thought valued <em>activity</em>, meaning self-enclosed contemplation, above <em>action</em>, meaning making and doing, which deals with change and is therefore “infected with non-being.” Knowledge (demonstrative and certain) likewise stands above belief (opinion, merely probable). Dewey suggests another job for philosophy: connecting what science tells us about how things are with our beliefs about what is worth pursuing. The tradition rules this out.' },
    { n: 'XV', title: 'The Scheme Hangs Together', at: 'Thus the depreciation of practice was given',
      gloss: 'The low standing of practice now has an <em>ontological</em> justification, one grounded in the nature of being. Ultimate reality is fixed, so it can be grasped by rational intuition and demonstrated like a theorem; certainty and immutability turn out to be the same thing. The cosmos is ranked: complete Being, the “unmoved mover”, at the top, and changing material things below, which can be known only in so far as they strive toward their ends. Being, knowledge and activity all divide along the same line.' },
    { n: 'XVI', title: 'The Framework Survives', at: 'Although this Greek formulation was made long ago',
      gloss: 'Despite revolutions in science and technology, Western culture has kept this framework intact. Two consequences follow. In <em>metaphysics</em>, whatever knowledge certifies becomes the measure of what is real, so values have a secure place in Being only once knowledge has validated them. In <em>epistemology</em>, we can truly know only what exists before our inquiry; anything our own action helps to produce is left to guesswork.' },
    { n: 'XVII', title: 'The Spectator Theory', at: 'Special theories of knowledge differ enormously',
      gloss: 'Rival theories of knowledge (empiricism, Kantian synthesis, idealism, realism) argue loudly but share one assumption: inquiry adds no practical activity to the object it knows. Knowing is modelled on seeing. Light travels from the object and changes the eye, never the thing seen, which sits in “regal aloofness”. Even the theories that let the mind intervene keep this premise, and so conclude that we know only “appearances”.' },
    { n: 'XVIII', title: 'The Root and the Road Ahead', at: 'All of these notions about certainty and the fixed',
      gloss: 'Dewey’s basic thesis is that all of these ideas, about certainty, reality, mind and knowing, grow from one root: the separation of theory from practice, set up for the sake of absolute certainty. The rest of the book follows each branch and argues that experimental science has itself become “a mode of directed practical doing.” The alternative he will defend is to seek <em>security</em> by practical means instead of <em>certainty</em> by cognitive means.' },
  ];

  /* ────────────────────────────── Scenes ────────────────────────────── */
  const S = [];
  const scene = (o) => S.push(o);

  // I ─ Two roads
  scene({ at: null, img: 'hazard', kb: [1.02, 1.14, -1.5, -1],
    html: svg(),
    q: [{ at: 'Man who lives in a world of hazards', text: 'Man who lives in a world of hazards is compelled to seek for security.', pos: 'bottom' }] });

  scene({ at: 'He has sought to attain it in two ways', img: 'hazard', dim: 'dim',
    html: svg(
      W(600, 120, 210, 70, OCH, { o: .45 }),
      T(600, 135, 'SECURITY', { f: 'serif', s: 54, a: 'fa', style: 'letter-spacing:6px' }),
      T(600, 190, 'sought in two ways', { s: 34, cls: 'f-ink2', d: .8 }),
      A(560, 215, 330, 320, { d: 1.2, bend: .08 }), A(640, 215, 870, 320, { d: 1.5, bend: -.08 }),
      W(300, 375, 220, 60, IND, { o: .22, at: 'One of them began' }),
      T(300, 390, 'Change the self', { f: 'serif', s: 46, at: 'One of them began', fill: IND }),
      T(300, 440, 'propitiate the powers', { s: 34, cls: 'f-ink2', at: 'propitiate the powers' }),
      T(300, 515, 'supplication', { s: 38, at: 'supplication' }),
      T(300, 565, 'sacrifice', { s: 38, at: 'sacrifice, ceremonial' }),
      T(300, 615, 'ceremonial rite', { s: 38, at: 'ceremonial rite' }),
      T(300, 665, 'magical cult', { s: 38, at: 'magical cult' }),
      P('M190 505 L410 500 M200 557 L400 553 M175 607 L425 603 M190 657 L410 653', { at: 'crude methods were largely displaced', cls: 'thin', sw: 2 }),
      A(300, 690, 300, 745, { at: 'contrite heart', cls: 'ind' }),
      T(300, 790, 'a contrite heart, inner reverence', { s: 36, at: 'contrite heart', fill: IND }),
      T(300, 845, '“ally himself with” destiny', { s: 34, at: 'willingly ally himself', cls: 'f-ink2' }),
      W(900, 375, 220, 60, SIE, { o: .2, d: 1.6 }),
      T(900, 390, 'Change the world', { f: 'serif', s: 46, d: 1.6, fill: SIE }),
      T(900, 440, '…the other course', { s: 34, cls: 'f-ink3', d: 2 })
    ) });

  scene({ at: 'The other course is to invent arts', img: 'fortress', kb: [1.0, 1.1, 1, -1.5],
    html: svg(
      B(80, 790, 1040, 86, { at: 'builds shelters', r: 40 }),
      T(220, 848, 'shelter', { s: 40, at: 'builds shelters', fill: SIE }),
      T(450, 848, 'garments', { s: 40, at: 'weaves garments', fill: SIE }),
      T(690, 848, 'fire, befriended', { s: 40, at: 'makes flame his friend', fill: SIE }),
      T(960, 848, 'associated living', { s: 40, at: 'associated living', fill: SIE })
    ),
    q: [{ at: 'man constructs a fortress', text: '…man constructs a fortress out of the very conditions and forces which threaten him.', pos: 'top' }] });

  scene({ at: 'This is the method of changing the world through action', img: 'fortress', dim: 'dim',
    html: svg(
      W(330, 250, 250, 150, IND, { o: .25 }), W(870, 250, 250, 150, SIE, { o: .25, d: .6 }),
      T(330, 225, 'changing the self', { f: 'serif', s: 50, fill: IND, at: 'as the other is the method' }),
      T(330, 285, 'in emotion and idea', { s: 38, at: 'emotion and idea' }),
      T(870, 225, 'changing the world', { f: 'serif', s: 50, fill: SIE }),
      T(870, 285, 'through action', { s: 38, d: .8 }),
      T(870, 380, 'felt as “dangerous pride, even defiance”', { s: 32, w: 26, at: 'dangerous pride', cls: 'f-ink2' }),
      // Promethean fire: gift or theft?
      G(`<path d="M600 655 C560 615 575 575 600 540 C603 575 640 585 628 625 C650 610 650 585 645 570 C680 610 670 660 600 680 C540 670 530 620 560 590 C560 615 575 640 600 655 Z" fill="${SIE}" opacity=".7" filter="url(#wash)" class="pulse"/>`, { at: 'People of old wavered', a: 'po' }),
      T(330, 620, 'the gift of the gods?', { s: 44, at: 'gift of the gods', fill: IND }),
      T(870, 620, 'an invasion of their prerogatives?', { s: 44, w: 18, at: 'invasion of their prerogatives', fill: SIE }),
      T(600, 770, 'either way: something superhuman, or unnatural', { s: 34, at: 'superhuman or unnatural', cls: 'f-ink2' })
    ),
    q: [{ at: 'The souls who have predicted', text: '…a kingdom of order, justice and beauty through mastery of nature’s energies and laws…', by: 'its prophets “have been few and little heeded”', pos: 'bottom' }] });

  // II ─ Disesteem of practice
  scene({ at: 'Men have been glad enough to enjoy', img: 'toil', dim: 'dim',
    html: svg(
      T(600, 95, 'the disesteem of practice', { f: 'serif', s: 50, a: 'fa', d: 5 }),
      `<path d="M600 520 L555 640 L645 640 Z" class="ink" style="fill:rgba(43,38,32,.08)" filter="url(#rough)"/>`,
      `<g class="c tilt" style="--r:11deg;transform-origin:600px 515px;transform-box:view-box" data-at="have been regarded as inferior">
        <path d="M250 515 L950 515" class="ink" stroke-width="5"/>
        <path d="M290 515 L230 640 M290 515 L350 640 M910 515 L850 640 M910 515 L970 640" class="ink thin"/>
        <path d="M200 640 Q290 690 380 640 Z M820 640 Q910 690 1000 640 Z" class="ink" style="fill:rgba(43,38,32,.05)"/>
        ${W(290, 600, 120, 40, IND, { o: .3, at: 'Philosophers have celebrated' })}
        ${W(910, 600, 120, 40, SIE, { o: .3, at: 'places in which the use of the arts' })}
      </g>`,
      T(290, 255, 'inner change', { f: 'serif', s: 44, fill: IND, at: 'Philosophers have celebrated' }),
      T(290, 310, 'ideas (philosophers)', { s: 34, at: 'change in personal ideas' }),
      T(290, 355, 'the heart (religious teachers)', { s: 34, at: 'religious teachers' }),
      T(290, 410, '“spiritual”', { s: 40, at: 'spiritual', fill: IND }),
      T(910, 255, 'the arts', { f: 'serif', s: 44, fill: SIE, at: 'places in which the use of the arts' }),
      T(910, 310, 'actual objective transformation', { s: 34, at: 'objective transformation' }),
      T(910, 355, '“inferior, if not base … menial”', { s: 34, at: 'menial' }),
      T(910, 410, '“material”', { s: 40, at: 'idea of the material', fill: SIE }),
      T(600, 790, 'conversions prized on their own account; action merely their evidence', { s: 32, w: 40, at: 'These conversions have been prized', cls: 'f-ink2' })
    ) });

  scene({ at: 'The depreciation of action, of doing and making', img: 'toil', kb: [1.0, 1.12, 0, 1.5],
    html: svg(),
    q: [{ at: 'They glorified their own office', text: 'They glorified their own office without doubt in placing theory so much above practice.', pos: 'bottom' }] });

  scene({ at: 'Work has been onerous', img: 'toil', dim: 'dim',
    html: svg(
      T(330, 120, 'knowing', { f: 'serif', s: 54, fill: IND }), T(870, 120, 'doing', { f: 'serif', s: 54, fill: SIE }),
      P('M600 80 L600 760', { cls: 'thin', d: .4 }),
      T(870, 200, 'onerous, toilsome, a primeval curse', { s: 36, w: 24, at: 'onerous, toilsome' }),
      T(330, 330, 'leisure', { s: 44, at: 'associated with leisure' }), T(870, 330, 'compulsion, necessity', { s: 44, at: 'under compulsion' }),
      T(330, 440, 'the free', { s: 44, at: 'slaves and serfs' }), T(870, 440, 'slaves and serfs', { s: 44, at: 'slaves and serfs' }),
      T(330, 550, 'immaterial, spiritual', { s: 44, at: 'immaterial and spiritual' }), T(870, 550, 'matter', { s: 44, at: 'with matter' }),
      T(330, 660, 'mind', { s: 44, at: 'done with the body' }), T(870, 660, 'body, mechanical appliances', { s: 44, w: 18, at: 'done with the body' }),
      W(870, 790, 280, 55, SIE, { o: .3, at: 'The disrepute which has attended' }),
      T(870, 805, 'disrepute transferred to practice', { s: 36, at: 'The disrepute which has attended' })
    ) });

  // III ─ Why?
  scene({ at: 'One might continue in this strain', img: 'questions', kb: [1.0, 1.1, -1, 0],
    html: svg(),
    q: [{ at: 'Why this invidious discrimination', text: 'Why this invidious discrimination?', pos: 'mid' }] });

  scene({ at: 'A very little reflection shows', img: 'questions', dim: 'dim',
    html: svg(
      B(70, 330, 360, 220, { d: .3 }),
      T(250, 415, 'social castes', { s: 44, d: .5 }), T(250, 470, 'emotional revulsions', { s: 44, d: .7 }),
      B(770, 330, 360, 220, { d: .9 }),
      T(950, 415, 'the belief:', { s: 38, d: 1.1, cls: 'f-ink2' }), T(950, 470, 'theory above practice', { s: 42, d: 1.1 }),
      A(440, 390, 760, 390, { at: 'bearing on its causation', bend: -.12, cls: 'sie', sw: 3 }),
      T(600, 300, 'causation ✓', { s: 42, fill: SIE, at: 'bearing on its causation' }),
      P('M440 500 Q600 600 760 500', { at: 'hardly reasons to be offered', cls: 'ind flow', sw: 3 }),
      T(600, 610, 'justification ✗', { s: 42, fill: IND, at: 'hardly reasons to be offered' }),
      T(600, 730, 'contempt for matter is not self-explanatory', { s: 36, at: 'not self-explanatory', cls: 'f-ink2' }),
      T(600, 800, '…and experimental science has since undercut the split', { s: 32, at: 'experimental method in the natural sciences', cls: 'f-ink3' })
    ) });

  (function () {
    const qs = [
      ['What is the cause and the import', 'Why the split of theory and practice?'],
      ['Why should the latter be disesteemed', 'Why scorn matter and body?'],
      ['What has been the effect upon the various modes', 'Effects on industry, politics, art, morals?'],
      ['How has the separation of intellect', 'Effects on the theory of knowledge?'],
      ['What has been in particular the effect upon', 'Effects on philosophy itself?'],
      ['What forces are at work', 'What forces are breaking it down?'],
      ['What would the effect be if the divorce', 'What if knowing and doing were rejoined?'],
      ['What revisions of the traditional theory', 'How must mind and thought be rethought?'],
      ['what change in the idea of the office', 'What becomes of philosophy’s task?'],
      ['What modifications would ensue', 'What changes in the human disciplines?'],
    ];
    const parts = [W(600, 450, 170, 90, OCH, { o: .45, d: .3 }), T(600, 440, 'knowing', { f: 'serif', s: 40, d: .5 }), T(600, 485, 'doing', { f: 'serif', s: 40, d: .5 }),
      P('M545 455 L655 455', { d: .8, sw: 3, cls: 'sie' })];
    qs.forEach(([at, label], i) => {
      const a = -Math.PI / 2 + (i / qs.length) * Math.PI * 2;
      const x = 600 + Math.cos(a) * 430, y = 450 + Math.sin(a) * 330;
      parts.push(P(`M${600 + Math.cos(a) * 175} ${450 + Math.sin(a) * 95} L${x - Math.cos(a) * 60} ${y - Math.sin(a) * 40}`, { at, cls: 'thin flow' }));
      parts.push(T(x, y, label, { s: 31, w: 20, vc: true, at, a: 'po' }));
    });
    scene({ at: 'The questions suggested have far-reaching issues', img: 'questions', dim: 'dim', html: svg(...parts) });
  })();

  scene({ at: 'These questions form the theme of this book', img: null,
    html: svg(
      W(330, 330, 230, 110, IND, { o: .25, at: 'exaltation of pure intellect' }),
      T(330, 320, 'exaltation of', { s: 40, at: 'exaltation of pure intellect' }),
      T(330, 375, 'pure intellect', { f: 'serif', s: 54, fill: IND, at: 'exaltation of pure intellect' }),
      A(560, 340, 650, 340, { at: 'fundamentally connected', sw: 3, arrow2: true }),
      W(880, 330, 250, 110, OCH, { o: .4, at: 'quest for a certainty' }),
      T(880, 320, 'the quest for', { s: 40, at: 'quest for a certainty' }),
      T(880, 375, 'absolute certainty', { f: 'serif', s: 54, at: 'quest for a certainty' }),
      T(600, 210, 'the book’s thesis, stated in advance', { s: 34, cls: 'f-ink3', at: 'This phase of the discussion will disclose' }),
      T(330, 620, 'practice → “precarious probability”', { s: 38, at: 'precarious probability', fill: SIE }),
      T(880, 620, 'thought → an escape?', { s: 38, at: 'Through thought, however', fill: IND })
    ),
    q: [{ at: 'Of it we are compelled to say', text: '“Act, but act at your peril.”', pos: 'mid', u: 'Judgment and belief regarding' }] });

  // IV ─ Peril
  scene({ at: 'Practical activity deals with individualized', img: null,
    html: svg(
      T(330, 120, 'practice', { f: 'serif', s: 54, fill: SIE }),
      T(870, 120, 'intellect', { f: 'serif', s: 54, fill: IND, at: 'The intellect, however' }),
      G([[230, 320, 70], [380, 300, 55], [300, 450, 80], [430, 440, 50], [210, 560, 45], [370, 590, 65]].map(([x, y, r], i) =>
        `<path class="wob" style="animation-delay:-${i * .7}s" d="M${x - r} ${y} C${x - r} ${y - r * .9} ${x + r * .3} ${y - r * 1.2} ${x + r} ${y - r * .2} C${x + r * 1.1} ${y + r * .8} ${x - r * .2} ${y + r * 1.1} ${x - r} ${y} Z" fill="${SIE}" opacity=".45" filter="url(#wash)"/>`).join(''), { d: .3 }),
      T(330, 700, 'individualized, unique situations, never exactly duplicable', { s: 32, w: 24, d: .8 }),
      T(330, 800, 'all activity involves change', { s: 34, at: 'All activity, moreover, involves change', fill: SIE }),
      `<circle cx="870" cy="420" r="150" fill="none" class="c dr ink ind" pathLength="1" stroke-width="4" data-at="universal Being"/>`,
      W(870, 420, 140, 140, IND, { o: .25, at: 'universal Being' }),
      T(870, 660, 'universal Being', { f: 'serif', s: 46, at: 'universal Being' }),
      T(870, 715, 'fixed and immutable', { s: 38, at: 'fixed and immutable', fill: IND }),
      G(`<circle cx="300" cy="380" r="13" fill="${INK}"/><path d="M300 393 L300 440 M300 410 L280 428 M300 410 L320 428 M300 440 L285 470 M300 440 L315 470" class="ink"/>`, { at: 'we human beings are involved', a: 'po' }),
      T(470, 230, 'and we are in it', { s: 34, at: 'we human beings are involved', cls: 'f-ink2' }),
      A(330, 360, 720, 360, { at: 'self-transcendence', bend: -.25, cls: 'flow' }),
      T(560, 240, 'self-transcendence?', { s: 36, at: 'self-transcendence', fill: IND })
    ) });

  scene({ at: 'There is no need to expatiate', img: 'mouse', kb: [1.0, 1.12, 1.2, -.5],
    html: svg(),
    q: [{ at: 'The burden of proverbs', text: '…the best laid plans of men as of mice gang agley.', by: 'after Robert Burns, “To a Mouse”, 1785', pos: 'top' }] });

  scene({ at: 'The pathos of unfulfilled expectation', img: 'fortune', kb: [1.03, 1.13, -1, .5],
    html: svg(),
    q: [{ at: 'We survey conditions', text: 'We survey conditions, make the wisest choice we can; we act, and we must trust the rest to fate, fortune or providence.', pos: 'bottom' }] });

  (function () {
    // Plans aimed at a target: the spread of outcomes widens with the importance of the issue.
    const panels = [['a small matter', 18], ['a serious one', 40], ['a momentous one', 78]];
    const parts = [T(600, 105, 'intent proposes, conditions dispose', { f: 'serif', s: 46, at: 'Moralists tell us' }),
      T(600, 150, 'illustration of Dewey’s claim, not data', { f: 'ui', s: 20, a: 'fa', at: 'Moralists tell us', cls: 'f-ink3' })];
    panels.forEach(([label, sd], k) => {
      const cx = 220 + k * 380, cy = 470;
      const at = k < 2 ? 'Judging, planning, choice' : 'The more important the issue';
      parts.push(`<g class="c fa" data-at="${at}" data-tip="${label[0].toUpperCase() + label.slice(1)}: outcomes scatter around the aim. Dewey: “Alien and indifferent natural forces, unforeseeable conditions enter in and have a decisive voice.”">`);
      [120, 80, 40].forEach((r, i) => parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" class="ink thin" style="fill:${i === 2 ? 'rgba(201,161,59,.25)' : 'none'}" opacity=".55"/>`));
      parts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/></g>`);
      parts.push(T(cx, 660, label, { s: 38, at }));
      for (let i = 0; i < 16; i++) {
        let x = cx + gauss() * sd, y = cy + gauss() * sd;
        const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy), lim = 165;
        if (dist > lim) { x = cx + dx / dist * lim; y = cy + dy / dist * lim; }
        parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${SIE}" stroke="#fbf7ec" stroke-width="2" class="c po" data-at="${at}" style="transition-delay:${(0.6 + i * 0.22).toFixed(2)}s"/>`);
      }
    });
    parts.push(T(600, 780, '“The more important the issue, the greater is their say”', { s: 38, at: 'The more important the issue', fill: SIE }));
    scene({ at: 'Moralists tell us to look to the end', img: 'fortune', dim: 'dim', html: svg(...parts) });
  })();

  // V ─ Safety first
  scene({ at: 'Hence men have longed to find a realm', img: 'tower', kb: [1.0, 1.1, 0, -1],
    html: svg(),
    q: [{ at: '“Safety first” has played', text: '“Safety first” has played a large rôle in effecting a preference for knowing over doing and making.', pos: 'bottom' }] });

  scene({ at: 'Thought has been alleged to be a purely inner activity', img: 'tower', dim: 'dim',
    html: svg(
      `<ellipse cx="600" cy="450" rx="500" ry="380" fill="${SIE}" opacity=".0" class="c wa" style="--o:.22" filter="url(#wash)" data-at="Failure and frustration are attributed"/>`,
      W(600, 450, 230, 200, IND, { o: .35, d: .2 }),
      `<circle cx="600" cy="450" r="215" fill="none" class="c dr ink ind" stroke-width="5" pathLength="1" data-at="purely inner activity"/>`,
      T(600, 425, 'mind', { f: 'serif', s: 64, d: .4 }),
      T(600, 485, 'complete, self-sufficient', { s: 38, at: 'complete and self-sufficient in itself' }),
      A(760, 340, 930, 230, { at: 'Overt action may follow', cls: 'flow thin' }),
      T(960, 200, 'overt action: “not intrinsic”', { s: 32, at: 'Overt action may follow', anc: 'middle' }),
      T(600, 790, 'failure is blamed on an “alien, intractable and inferior realm”', { s: 36, w: 36, at: 'Failure and frustration are attributed', fill: SIE }),
      ...[[160, 210], [1040, 560], [220, 640], [980, 760]].map(([x, y], i) => P(`M${x} ${y} l18 30 l-14 4 l20 34`, { at: 'Failure and frustration are attributed', sw: 3, cls: 'sie' })),
      T(600, 690, 'its supremacy uninjured', { s: 34, at: 'in no way injures the supremacy', fill: IND })
    ) });

  (function () {
    // the arts spiral: each protection breeds a new peril
    const nodes = [['an art', 'Thus the arts by which man attains', SIE], ['relative security', 'relative, ever incomplete', SIE],
      ['new dangers', 'source of new dangers', INK], ['new protections', 'its own measures of protection', SIE], ['unexpected consequences', 'new and unexpected consequences', INK]];
    const parts = [T(600, 95, 'the arts: security that breeds new peril', { f: 'serif', s: 46, d: .4 })];
    const pts = nodes.map((_, i) => { const a = -2.4 + i * 1.32, r = 120 + i * 50; return [600 + Math.cos(a) * r * 1.45, 470 + Math.sin(a) * r]; });
    pts.forEach(([x, y], i) => {
      if (i) parts.push(A(pts[i - 1][0], pts[i - 1][1], x, y, { at: nodes[i][1], bend: .35, cls: 'thin' }));
      parts.push(W(x, y, 130, 50, nodes[i][2], { o: .25, at: nodes[i][1] }));
      parts.push(T(x, y + 12, nodes[i][0], { s: 38, at: nodes[i][1], fill: nodes[i][2] === INK ? INK : SIE }));
    });
    scene({ at: 'Thus the arts by which man attains', img: 'fortress', dim: 'dim', html: svg(...parts) });
  })();

  scene({ at: 'The quest for certainty is a quest for a peace', img: null,
    html: svg(
      P('M240 150 L240 770 L1060 770', { d: .2, arrow: true }),
      T(650, 840, 'how uncertain the outcome →', { f: 'ui', s: 24, a: 'fa', d: .5, cls: 'f-ink3' }),
      `<text class="c fa ui f-ink3" font-size="24" text-anchor="middle" transform="translate(185 460) rotate(-90)" data-d=".5">what is at stake →</text>`,
      T(240, 800, 'certain', { f: 'ui', s: 20, a: 'fa', d: .5, cls: 'f-ink3' }),
      P('M650 160 L650 760 M250 460 L1050 460', { cls: 'thin', d: .6 }),
      `<rect x="250" y="160" width="398" height="298" fill="${IND}" opacity=".0" class="c wa" style="--o:.22" filter="url(#wash)" data-at="a peace which is assured" data-tip="The quest for certainty: “a peace which is assured, an object which is unqualified by risk.”"/>`,
      T(450, 300, 'assured peace', { f: 'serif', s: 44, fill: IND, at: 'a peace which is assured' }),
      T(450, 350, 'what the quest seeks', { s: 32, at: 'a peace which is assured', cls: 'f-ink2' }),
      `<rect x="652" y="160" width="398" height="298" fill="${SIE}" opacity="0" class="c wa" style="--o:.3" filter="url(#wash)" data-at="peril of evils" data-tip="Uncertainty that carries the threat of evil: this is what people actually dislike."/>`,
      T(850, 300, 'peril of evils', { f: 'serif', s: 44, fill: SIE, at: 'peril of evils' }),
      T(850, 350, 'the sting: what we flee', { s: 32, at: 'peril of evils', cls: 'f-ink2' }),
      `<rect x="652" y="462" width="398" height="298" fill="${OCH}" opacity="0" class="c wa" style="--o:.32" filter="url(#wash)" data-at="zest of adventure" data-tip="Uncertainty about outcomes that are all enjoyable has no sting: “the zest of adventure and the spice of variety”."/>`,
      T(850, 600, 'zest of adventure', { f: 'serif', s: 44, at: 'zest of adventure' }),
      T(850, 650, 'spice of variety', { s: 34, at: 'spice of variety', cls: 'f-ink2' }),
      T(1075, 315, 'high stakes', { f: 'ui', s: 20, a: 'fa', anc: 'start', d: .6, cls: 'f-ink3' }),
      T(1075, 615, 'low stakes', { f: 'ui', s: 20, a: 'fa', anc: 'start', d: .6, cls: 'f-ink3' }),
      T(650, 110, '“it is not uncertainty per se which men dislike”', { s: 38, at: 'it is not uncertainty per se' })
    ),
    q: [{ at: 'Quest for complete certainty can be fulfilled', text: 'Quest for complete certainty can be fulfilled in pure knowing alone.', by: '“Such is the verdict of our most enduring philosophic tradition”', pos: 'bottom', u: 'While the tradition has' }] });

  // VI ─ Modern temper
  scene({ at: 'While the tradition has, as we shall see', img: 'modern', kb: [1.0, 1.1, -1, -1],
    html: svg(),
    q: [{ at: 'has learned to play with sources of danger', text: '…has learned to play with sources of danger. He even seeks them out, weary of the routine of a too sheltered life.', pos: 'bottom', u: 'The enormous change taking place' },
      { at: 'The enormous change taking place in the position of women', text: 'The changing position of women: protection no longer prized as an end in itself.', pos: 'top' }] });

  (function () {
    // Schematic: the means of protection grow while the felt need for assurance falls.
    const eras = ['early humans', 'antiquity', 'middle ages', '1929'];
    const X = (i) => 260 + i * 250, Y = (v) => 720 - v * 5.2;
    const prot = [8, 25, 38, 92], need = [94, 80, 72, 34];
    const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' ');
    const parts = [
      T(640, 95, 'protection and the felt need for assurance', { f: 'serif', s: 44, d: .3 }),
      T(640, 135, 'a schematic of Dewey’s suggestion; the curves are not measured data', { f: 'ui', s: 20, a: 'fa', d: .3, cls: 'f-ink3' }),
      P(`M200 ${Y(0)} L1060 ${Y(0)}`, { cls: 'thin', d: .5 }),
      ...eras.map((e, i) => T(X(i), 770, e, { f: 'ui', s: 22, a: 'fa', d: .6, cls: 'f-ink2' })),
      P(line(need), { at: 'We have attained, at least subconsciously', cls: 'ind slow', sw: 4 }),
      P(line(prot), { at: 'protection of thousands of arts', cls: 'sie slow', sw: 4 }),
    ];
    need.forEach((v, i) => parts.push(`<circle cx="${X(i)}" cy="${Y(v)}" r="9" fill="${IND}" stroke="#fbf7ec" stroke-width="3" class="c po" data-at="We have attained, at least subconsciously" style="transition-delay:${0.5 + i * .5}s" data-tip="Felt need for assurance, ${eras[i]}: ${['dominant', 'still pressing', 'still pressing', 'receding'][i]}"/>`));
    prot.forEach((v, i) => parts.push(`<circle cx="${X(i)}" cy="${Y(v)}" r="9" fill="${SIE}" stroke="#fbf7ec" stroke-width="3" class="c po" data-at="protection of thousands of arts" style="transition-delay:${0.5 + i * .5}s" data-tip="Means of protection, ${eras[i]}: ${['almost none', 'a few arts', 'more arts', '“thousands of arts” and insurance'][i]}"/>`));
    parts.push(T(X(0) + 20, Y(need[0]) - 30, 'felt need for assurance', { s: 34, anc: 'start', fill: IND, at: 'We have attained, at least subconsciously' }));
    parts.push(T(X(3) - 10, Y(prot[3]) - 30, 'means of protection', { s: 34, anc: 'end', fill: SIE, at: 'protection of thousands of arts' }));
    parts.push(T(X(3) - 20, Y(prot[3]) + 30, '+ insurance', { s: 30, anc: 'end', at: 'schemes of insurance', cls: 'f-ink2' }));
    parts.push(T(X(3) + 10, Y(need[3]) + 64, 'but: the fears war leaves', { s: 30, anc: 'end', at: 'Barring the fears which war', cls: 'f-ink2' }));
    scene({ at: 'We have attained, at least subconsciously', img: 'modern', dim: 'dim', html: svg(...parts) });
  })();

  // VII ─ Primitive peril
  scene({ at: 'This suggestion is speculative', img: 'night', kb: [1.0, 1.14, 0, 1],
    html: svg(),
    q: [{ at: 'men faced the forces of nature', text: '…men faced the forces of nature in a state of nakedness which was more than physical…', pos: 'top' }] });

  (function () {
    const crises = [['birth', 'birth, puberty'], ['puberty', 'puberty, illness'], ['illness', 'illness, death'], ['death', 'death, war'], ['war', 'war, famine'],
      ['famine', 'famine, plague'], ['plague', 'plague, the uncertainties'], ['the hunt', 'uncertainties of the hunt'], ['climate', 'vicissitudes of climate'], ['the seasons', 'great seasonal changes']];
    const parts = [
      `<circle cx="600" cy="460" r="290" fill="none" class="c dr ink thin" pathLength="1" data-at="The precarious crises" stroke-dasharray="1"/>`,
      W(600, 460, 190, 150, IND, { o: .3, d: .3 }),
      T(600, 430, 'powers beyond', { f: 'serif', s: 44, d: .5 }), T(600, 480, 'control', { f: 'serif', s: 44, d: .5 }),
      T(600, 535, 'gifts and inflictions', { s: 34, at: 'the gifts and the inflictions', fill: IND }),
    ];
    crises.forEach(([label, at], i) => {
      const a = -Math.PI / 2 + i / crises.length * Math.PI * 2;
      const x = 600 + Math.cos(a) * 365, y = 470 + Math.sin(a) * 330;
      parts.push(W(x, y - 12, 82, 34, SIE, { o: .22, at }));
      parts.push(T(x, y, label, { s: 38, at, a: 'po' }));
    });
    parts.push(T(600, 875, 'imagination occupied with the uncertain', { s: 32, at: 'kept imagination occupied', cls: 'f-ink2' }));
    scene({ at: 'In consequence, mystery attended', img: 'night', dim: 'dim', html: svg(...parts) });
  })();

  scene({ at: 'Any scene or object that was implicated', img: 'omen', kb: [1.0, 1.1, 1, 0],
    html: svg(
      B(60, 740, 400, 120, { at: 'harbinger of good' }),
      T(260, 795, 'harbinger of good', { s: 40, at: 'harbinger of good', fill: IND }),
      T(260, 838, 'cherished like a good tool', { s: 30, at: 'cherished as means', cls: 'f-ink2' }),
      B(740, 740, 400, 120, { at: 'omen of evil' }),
      T(940, 795, 'omen of evil', { s: 40, at: 'omen of evil', fill: SIE }),
      T(940, 838, 'feared and shunned', { s: 30, at: 'feared and shunned', cls: 'f-ink2' })
    ) });

  scene({ at: 'As a drowning man is said to grasp', img: 'straw', kb: [1.02, 1.15, 0, -1],
    html: svg(),
    q: [{ at: 'As a drowning man', text: 'As a drowning man is said to grasp at a straw…', pos: 'top', u: 'The attention, interest and care' }] });

  (function () {
    const then = [['noting omens', .9], ['prognostications', .7], ['ritual ceremonies', 1], ['magical objects', .8]];
    const now = [['skill with appliances', 1.7], ['invention of better means', 1.7]];
    const x0 = 210, wTot = 860;
    const bar = (items, y, color, at) => {
      const sum = items.reduce((s, [, v]) => s + v, 0); let x = x0; const out = [];
      items.forEach(([label, v], i) => {
        const w = (v / sum) * wTot;
        out.push(`<rect x="${(x + 2).toFixed(1)}" y="${y}" width="${(w - 4).toFixed(1)}" height="110" rx="6" fill="${color}" opacity="${0.28 + 0.14 * (i % 2)}" filter="url(#rough)" class="c lt" data-at="${at}" style="transition-delay:${i * .35}s" data-tip="${label}"/>`);
        out.push(T(x + w / 2, y + 66, label, { s: 31, w: 13, vc: true, at, style: `transition-delay:${i * .35 + .2}s` }));
        x += w;
      });
      return out.join('');
    };
    scene({ at: 'The attention, interest and care', img: 'straw', dim: 'dim',
      html: svg(
        T(640, 120, 'the same care, spent differently', { f: 'serif', s: 46, d: .3 }),
        T(640, 160, 'schematic: one fixed budget of attention, divided two ways', { f: 'ui', s: 20, a: 'fa', d: .3, cls: 'f-ink3' }),
        T(190, 335, 'now', { s: 40, anc: 'end', d: .6, fill: SIE }), bar(now, 270, SIE, 'The attention, interest and care'),
        T(190, 545, 'then', { s: 40, anc: 'end', at: 'were devoted to noting omens', fill: IND }), bar(then, 480, IND, 'were devoted to noting omens'),
        T(640, 720, 'in such an atmosphere, primitive religion was born', { s: 36, at: 'In such an atmosphere primitive religion', cls: 'f-ink2' })
      ),
      q: [{ at: 'Rather this atmosphere was the religious disposition', text: 'Rather this atmosphere <span class="ul">was</span> the religious disposition.', pos: 'bottom' }] });
  })();

  // VIII ─ Ritual beside skill
  scene({ at: 'Search for alliance with means', img: 'ritual', kb: [1.0, 1.12, -1, 0], html: svg() });

  (function () {
    const rows = [['a weapon', 'The making of a weapon'], ['a bowl', 'the molding of a bowl'], ['a mat', 'the weaving of a mat'], ['seed', 'the sowing of seed'], ['a harvest', 'the reaping of a harvest']];
    const parts = [T(600, 100, 'every craft had its double', { f: 'serif', s: 46, d: .3 }),
      T(330, 180, 'technical skill', { s: 40, fill: SIE, d: .5 }), T(870, 180, 'ritual act', { s: 40, fill: IND, d: .5 })];
    rows.forEach(([label, at], i) => {
      const y = 280 + i * 100;
      parts.push(W(330, y - 12, 150, 36, SIE, { o: .28, at }));
      parts.push(W(870, y - 12, 150, 36, IND, { o: .28, at: 'required acts different in kind', d: i * .3 }));
      parts.push(T(600, y, label, { f: 'serif', s: 42, at }));
      parts.push(T(330, y, 'craft', { s: 34, at, cls: 'f-ink2' }));
      parts.push(T(870, y, 'rite', { s: 34, at: 'required acts different in kind', cls: 'f-ink2' }));
    });
    parts.push(T(870, 815, '“different in kind”, with “a special solemnity”', { s: 32, at: 'special solemnity', fill: IND }));
    scene({ at: 'The making of a weapon', img: 'ritual', dim: 'dim', html: svg(...parts) });
  })();

  scene({ at: 'While it is difficult to avoid the use of the word supernatural', img: 'borderland', kb: [1.0, 1.1, 0, 0],
    html: svg(),
    q: [{ at: 'As long as there was no defined area', text: 'As long as there was no defined area of the natural, that which is over and beyond the natural can have no significance.', pos: 'bottom' }] });

  scene({ at: 'The distinction, as anthropological students', img: 'borderland', dim: 'dim',
    html: svg(
      W(430, 450, 300, 250, SIE, { o: .28, d: .3 }),
      W(780, 450, 300, 250, IND, { o: .28, at: 'the crucial incident' }),
      T(330, 330, 'the ordinary', { f: 'serif', s: 46, d: .5 }),
      T(330, 385, 'the prosaic, usual run of events', { s: 32, w: 18, at: 'the prosaic, usual run' }),
      T(880, 330, 'the extraordinary', { f: 'serif', s: 46, at: 'the crucial incident' }),
      T(880, 385, 'the crucial incident, the irruption', { s: 32, w: 18, at: 'the crucial incident' }),
      `<ellipse cx="605" cy="520" rx="110" ry="190" fill="url(#hatch)" class="c fa" data-at="There was a no-man’s land"/>`,
      `<defs><pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 L0 14" stroke="${INK}" stroke-width="2" opacity=".25"/></pattern></defs>`,
      T(605, 535, 'no-man’s land', { s: 40, at: 'There was a no-man’s land' }),
      A(930, 600, 400, 640, { at: 'the extraordinary might invade', bend: -.18, sw: 3, cls: 'ind' }),
      T(300, 720, 'wreck it…', { s: 40, at: 'either wreck it', fill: SIE }),
      T(300, 780, '…or clothe it with surprising glory', { s: 34, at: 'clothe it with some surprising glory', fill: IND })
    ) });

  // IX ─ Holy and lucky
  scene({ at: 'The two dominant conceptions, cultural categories', img: 'holy', dim: 'dim',
    html: svg(
      T(600, 120, 'two cultural categories', { f: 'serif', s: 46, d: .3 }),
      W(330, 330, 200, 70, IND, { o: .3, at: 'the holy and the fortunate' }), T(330, 345, 'the holy', { f: 'serif', s: 56, at: 'the holy and the fortunate' }),
      W(870, 330, 220, 70, OCH, { o: .4, at: 'the holy and the fortunate' }), T(870, 345, 'the fortunate', { f: 'serif', s: 56, at: 'the holy and the fortunate' }),
      P('M330 400 L330 520', { at: 'the profane and the unlucky', arrow: true, arrow2: true }), P('M870 400 L870 520', { at: 'the profane and the unlucky', arrow: true, arrow2: true }),
      T(330, 590, 'the profane', { f: 'serif', s: 48, at: 'the profane and the unlucky', cls: 'f-ink2' }),
      T(870, 590, 'the unlucky', { f: 'serif', s: 48, at: 'the profane and the unlucky', cls: 'f-ink2' }),
      T(600, 740, 'meanings not to be read through present usage', { s: 34, at: 'meanings are not to be assigned', cls: 'f-ink3' })
    ) });

  scene({ at: 'Everything which was charged with some extraordinary potency', img: 'holy', kb: [1.0, 1.12, 0, -1],
    html: svg(
      B(70, 70, 330, 220, { at: 'Tabus, a whole set' }),
      T(235, 130, 'tabus', { f: 'serif', s: 44, at: 'Tabus, a whole set' }),
      T(235, 180, 'prohibitions, injunctions', { s: 30, at: 'Tabus, a whole set' }),
      T(235, 245, 'contagious potency', { s: 34, at: 'capable of transmitting', fill: SIE }),
      B(800, 70, 330, 220, { at: 'rites of purification' }),
      T(965, 130, 'preconditions', { f: 'serif', s: 40, at: 'rites of purification' }),
      T(965, 180, 'purification · humiliation', { s: 30, at: 'rites of purification' }),
      T(965, 225, 'fasting · prayer', { s: 30, at: 'fasting and prayer' })
    ),
    q: [{ at: 'From it there issues the command', text: 'Noli me tangere', by: '“Touch me not”: the risen Christ to Mary Magdalene, John 20:17', pos: 'mid', u: 'Tabus, a whole set' },
      { at: 'which politicians of all ages', text: '…a fact which politicians of all ages have known how to utilize.', pos: 'bottom' }] });

  (function () {
    const rows = [
      ['approached with awe', 'used, manipulated', 'A lucky object is something to be used'],
      ['supplication, humiliation', 'incantations, spells, divinations', 'It calls for incantations'],
      ['vague, unlocalized', 'concrete, tangible', 'tends to be a concrete and tangible object'],
      ['the vaguer, the more potent', 'pressured, coerced, scolded', 'The lucky object is subject to pressure'],
      ['', 'discarded if it fails', 'It might be discarded'],
      ['dependence, subjection', 'mastery', 'element of mastery'],
    ];
    const parts = [T(330, 120, 'the holy', { f: 'serif', s: 54, fill: IND, d: .3 }), T(870, 120, 'the lucky', { f: 'serif', s: 54, fill: SIE, d: .6 }),
      P('M600 80 L600 820', { cls: 'thin', d: .5 })];
    rows.forEach(([h, l, at], i) => {
      const y = 230 + i * 100;
      if (h) parts.push(T(330, y, h, { s: 38, at }));
      parts.push(T(870, y, l, { s: 38, at }));
    });
    scene({ at: 'But a difference early developed', img: 'lucky', dim: 'half', html: svg(B(40, 50, 1120, 800, { d: .1, r: 30 }), ...parts) });
  })();

  (function () {
    let d = 'M120 450';
    for (let x = 120; x <= 1080; x += 10) d += ` L${x} ${(450 - Math.sin((x - 120) / 960 * Math.PI * 6) * 150).toFixed(1)}`;
    scene({ at: 'Thus there was a kind of rhythm', img: 'lucky', dim: 'dim',
      html: svg(
        T(600, 110, 'a rhythm', { f: 'serif', s: 50, d: .2 }),
        `<path d="${d}" pathLength="1" class="c dr ink slow" stroke-width="4" data-d=".4"/>`,
        ...[200, 520, 840].map((x, i) => T(x, 260, ['domination', 'imprecation', 'utilization'][i], { s: 40, fill: SIE, at: ['of domination', 'of imprecation', 'of utilization'][i] })),
        ...[360, 680, 1000].map((x, i) => T(x, 680, ['submission', 'supplication', 'communion'][i], { s: 40, fill: IND, at: ['and submission', 'and supplication', 'and communion'][i] })),
      ) });
  })();

  // X ─ Dualism
  scene({ at: 'Such statements give, of course, a one-sided picture', img: 'ritual', dim: 'dim',
    html: svg(
      `<rect x="0" y="470" width="1200" height="430" fill="${IND}" opacity="0" class="c wa" style="--o:.16" filter="url(#wash)" data-at="more or less submerged"/>`,
      P('M40 470 C200 455 360 485 600 468 C840 452 1000 486 1160 470', { at: 'more or less submerged', sw: 3 }),
      W(600, 300, 330, 120, OCH, { o: .38, at: 'surrounded by others of an imaginative' }),
      T(600, 285, 'beliefs about the extraordinary', { f: 'serif', s: 44, at: 'surrounded by others of an imaginative' }),
      T(600, 340, 'imaginative, emotional: prestige and authority', { s: 34, at: 'prestige attached to the latter', fill: SIE }),
      T(600, 600, 'prosaic knowledge of ordinary things', { f: 'serif', s: 42, at: 'prosaic knowledge of the properties' }),
      T(600, 655, 'tools, skills, matter-of-fact daily life', { s: 34, at: 'some tools and some modes of skill', cls: 'f-ink2' }),
      T(600, 760, 'submerged', { s: 40, at: 'more or less submerged', fill: IND }),
      T(600, 130, 'the same today, wherever religious belief has vitality', { s: 32, at: 'We find the same phenomenon', cls: 'f-ink3' })
    ) });

  (function () {
    // Illustrative placement: evidence vs prestige
    const X = (v) => 220 + v * 8.2, Y = (v) => 760 - v * 5.6;
    const prosaic = [['flint flakes along a ridge', 90, 8], ['clay hardens in fire', 78, 22], ['when to sow', 66, 36], ['habits of game', 94, 48]];
    const sacred = [['omens', 14, 88], ['holy rites', 22, 96], ['tabus', 10, 76], ['the lucky charm', 30, 68]];
    const parts = [
      T(640, 85, 'prestige ran opposite to evidence', { f: 'serif', s: 44, d: .2 }),
      T(640, 122, 'illustrative placement, not measured data', { f: 'ui', s: 20, a: 'fa', d: .2, cls: 'f-ink3' }),
      P(`M220 180 L220 760 L1060 760`, { d: .3, arrow: true, arrow2: true }),
      T(640, 815, 'backed by the senses and by useful fruits →', { f: 'ui', s: 22, a: 'fa', d: .4, cls: 'f-ink2' }),
      `<text class="c fa ui f-ink2" font-size="22" text-anchor="middle" transform="translate(175 470) rotate(-90)" data-d=".4">glamour and prestige →</text>`,
    ];
    const dot = (arr, color, at, side) => arr.forEach(([label, x, y], i) => {
      parts.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="11" fill="${color}" stroke="#fbf7ec" stroke-width="3" class="c po" data-at="${at}" style="transition-delay:${i * .3}s" data-tip="${label}: ${color === SIE ? 'verifiable and useful, yet low in prestige' : 'unverifiable, yet held in awe'}"/>`);
      parts.push(T(X(x) + (side === 'l' ? -20 : 20), Y(y) + 10, label, { s: 31, anc: side === 'l' ? 'end' : 'start', at, style: `transition-delay:${i * .3 + .1}s` }));
    });
    dot(prosaic, SIE, 'Prosaic beliefs about verifiable facts', 'l');
    dot(sacred, IND, 'vogue of objects of rite and ceremony', 'r');
    parts.push(T(900, 360, 'familiar → “on a par”', { s: 34, at: 'Familiarity breeds', fill: SIE }));
    parts.push(T(560, 240, 'awe → superior status', { s: 34, at: 'regarded with awe', fill: IND, anc: 'start' }));
    scene({ at: 'Prosaic beliefs about verifiable facts', img: null, html: svg(...parts) });
  })();

  scene({ at: 'Herein is the source of the fundamental dualism', img: 'realms', kb: [1.0, 1.1, 0, 1],
    html: svg(
      B(740, 70, 420, 170, { at: 'The superior was that' }),
      T(950, 125, 'the superior realm', { f: 'serif', s: 42, at: 'The superior was that', fill: IND }),
      T(950, 175, 'occurrences beyond control, powers beyond the mundane', { s: 30, w: 28, at: 'so uncontrollable' }),
      B(40, 680, 420, 170, { at: 'The inferior was that' }),
      T(250, 735, 'the inferior realm', { f: 'serif', s: 42, at: 'The inferior was that', fill: SIE }),
      T(250, 785, 'foresight, instruments, arts, a reasonable control', { s: 30, w: 28, at: 'in which man could foresee' })
    ),
    q: [{ at: 'Herein is the source', text: 'Herein is the source of the fundamental dualism of human attention and regard.', pos: 'mid', u: 'The distinction between the two attitudes' }] });

  // XI ─ Philosophy inherits
  scene({ at: 'The philosophical tradition regarding knowledge and practice', img: 'realms', dim: 'dim',
    html: svg(
      ...['primitive culture', 'religion', 'philosophy'].map((h, i) => T(220 + i * 380, 130, h, { f: 'ui', s: 24, a: 'fa', d: .3 + i * .3, cls: 'f-ink3', style: 'letter-spacing:3px' })),
      W(220, 320, 170, 75, IND, { o: .26, d: .5 }), T(220, 310, 'the extraordinary', { s: 36, d: .6 }), T(220, 350, 'rites, ceremonies', { s: 30, d: .7, cls: 'f-ink2' }),
      W(600, 320, 170, 75, IND, { o: .3, at: 'nearer the divine' }), T(600, 310, 'the divine', { s: 38, at: 'in comparison with the extraordinary and divine' }), T(600, 350, 'story, emotion', { s: 30, at: 'in comparison with the extraordinary and divine', cls: 'f-ink2' }),
      W(980, 320, 170, 75, IND, { o: .38, at: 'Philosophy inherited the realm' }), T(980, 310, 'higher Being', { f: 'serif', s: 42, at: 'Philosophy inherited the realm' }), T(980, 350, 'rational form', { s: 30, at: 'Philosophy reflected upon it', cls: 'f-ink2' }),
      A(330, 320, 480, 320, { at: 'domesticated', cls: 'ind' }), A(710, 320, 860, 320, { at: 'Philosophy inherited the realm', cls: 'ind', sw: 3.5 }),
      W(220, 600, 170, 75, SIE, { o: .26, d: .5 }), T(220, 590, 'everyday arts', { s: 36, d: .6 }), T(220, 630, 'toil, livelihood', { s: 30, d: .7, cls: 'f-ink2' }),
      W(600, 600, 170, 75, SIE, { o: .26, at: 'the store of matter-of-fact knowledge' }), T(600, 590, 'matter-of-fact', { s: 36, at: 'the store of matter-of-fact knowledge' }), T(600, 630, 'knowledge', { s: 36, at: 'the store of matter-of-fact knowledge' }),
      W(980, 600, 170, 75, SIE, { o: .2, at: 'different from that accompanying the empirical arts' }), T(980, 590, 'the empirical arts', { s: 36, at: 'different from that accompanying the empirical arts' }), T(980, 630, 'lower in esteem', { s: 30, at: 'different from that accompanying the empirical arts', cls: 'f-ink2' }),
      A(330, 600, 480, 600, { at: 'store of matter-of-fact', cls: 'sie' }), A(710, 600, 860, 600, { at: 'different from that accompanying the empirical arts', cls: 'sie' }),
      T(600, 760, 'known “because of what they did”', { s: 36, at: 'because of what they did', fill: SIE }),
      T(980, 455, 'breathed “an air purer”', { s: 32, at: 'It breathed an air purer', fill: IND })
    ) });

  scene({ at: 'The change from religion to philosophy', img: 'temple', kb: [1.0, 1.1, 0, -1],
    html: svg(
      B(40, 690, 460, 150, { at: 'story told in imaginative' }),
      T(270, 750, 'story', { f: 'serif', s: 44, at: 'story told in imaginative' }),
      T(270, 800, 'imaginative and emotional', { s: 32, at: 'story told in imaginative', cls: 'f-ink2' }),
      A(510, 765, 690, 765, { at: 'rational discourse', sw: 3 }),
      B(700, 690, 460, 150, { at: 'rational discourse' }),
      T(930, 750, 'rational discourse', { f: 'serif', s: 44, at: 'rational discourse' }),
      T(930, 800, 'the canons of logic', { s: 32, at: 'canons of logic', cls: 'f-ink2' }),
      T(600, 640, 'the form changes; the content stays the same', { s: 36, d: 2.5, fill: SIE })
    ) });

  scene({ at: 'It is well known that that portion', img: 'temple', dim: 'dim',
    html: svg(
      T(600, 95, 'Aristotle (384–322 BC)', { f: 'ui', s: 22, a: 'fa', d: .3, cls: 'f-ink3', style: 'letter-spacing:2px' }),
      T(330, 210, 'metaphysics', { f: 'serif', s: 54, at: 'later generations have called metaphysics' }),
      T(600, 210, '=', { f: 'serif', s: 54, at: 'he called First Philosophy' }),
      T(870, 210, 'First Philosophy', { f: 'serif', s: 54, at: 'he called First Philosophy' }),
      T(600, 290, 'it seems coldly rational, objective, analytic…', { s: 34, at: 'coldly rational', cls: 'f-ink2' }),
      T(600, 340, '…the traits of all Being whatsoever', { s: 34, at: 'most comprehensive', cls: 'f-ink2' }),
      W(600, 445, 260, 60, SIE, { o: .3, at: 'theology; he says it is higher' }),
      T(600, 465, '= theology', { f: 'serif', s: 60, at: 'theology; he says it is higher', fill: SIE }),
      T(600, 560, 'higher than other sciences, which deal with generation and production', { s: 32, w: 46, at: 'higher than other sciences' }),
      T(600, 640, 'its objects are divine', { s: 38, at: 'meet for God', fill: IND }),
      T(600, 710, 'primary · eternal · self-sufficient', { s: 38, at: 'primary, eternal and self-sufficient', fill: IND }),
      T(600, 790, 'the Good: not the human good, but eternal perfection', { s: 34, at: 'the Good is among the first principles', cls: 'f-ink2' })
    ) });

  scene({ at: 'Aristotle tells us that from remote antiquity', img: 'heavens', kb: [1.0, 1.14, 1, 0],
    html: svg(),
    q: [{ at: 'the heavenly bodies are gods', text: '…the heavenly bodies are gods, and … the divine encompasses the entire natural world.', pos: 'bottom', u: 'The negative work' }] });

  scene({ at: 'The negative work of philosophy', img: 'heavens', dim: 'dim',
    html: svg(
      `<circle cx="600" cy="470" r="230" fill="none" stroke="${INK}" stroke-width="22" opacity=".18" filter="url(#wash)" class="c fa gone-on" data-at="to strip away these imaginative"/>`,
      `<circle cx="600" cy="470" r="230" fill="none" class="ink thin" stroke-dasharray="6 9" opacity=".7"/>`,
      T(600, 225, 'myths for the masses', { s: 36, cls: 'f-ink2 gone-on', at: 'to strip away these imaginative', a: 'fa' }),
      W(600, 470, 150, 150, OCH, { o: .5, d: .3 }),
      T(600, 455, 'the divine', { f: 'serif', s: 44, d: .4 }), T(600, 500, 'encompasses nature', { s: 34, d: .5 }),
      T(600, 760, 'felt by the masses as an attack', { s: 32, at: 'The masses only felt', cls: 'f-ink3' }),
      A(470, 370, 240, 210, { at: 'made the basis of philosophy', bend: .1, cls: 'ind' }), T(220, 180, 'the basis of philosophy', { s: 38, at: 'made the basis of philosophy', fill: IND }),
      A(730, 370, 960, 210, { at: 'foundation of physical', bend: -.1, cls: 'sie' }), T(980, 180, 'foundation of physical science', { s: 38, at: 'foundation of physical', fill: SIE }),
      A(600, 620, 600, 700, { at: 'discovery of logic', sw: 3 }), T(600, 840, 'logic: necessary and immutable objects', { s: 38, at: 'discovery of logic' })
    ),
    q: [{ at: 'Pure contemplation of these forms', text: 'Pure contemplation of these forms was man’s highest and most divine bliss, a communion with unchangeable truth.', pos: 'mid', u: 'The geometry of Euclid' }] });

  // XII ─ Euclid
  scene({ at: 'The geometry of Euclid doubtless gave', img: 'euclid', dim: 'half',
    html: svg(
      B(150, 120, 900, 720, { d: .1, r: 30 }),
      `<circle cx="470" cy="580" r="260" pathLength="1" class="c dr ink ind thin" data-at="owed nothing to observation"/>`,
      `<circle cx="730" cy="580" r="260" pathLength="1" class="c dr ink ind thin" data-at="beyond mere exemplification"/>`,
      `<path d="M470 580 L730 580" pathLength="1" class="c dr ink" stroke-width="4" data-at="The geometry of Euclid"/>`,
      `<path d="M470 580 L600 354.8 L730 580" pathLength="1" class="c dr ink sie" stroke-width="4" data-at="eternal and necessary relations"/>`,
      `<path d="M470 580 L600 354.8 L730 580 Z" fill="${SIE}" class="c wa" style="--o:.25" filter="url(#wash)" data-at="reason alone could trace"/>`,
      `<circle cx="600" cy="354.8" r="8" fill="${INK}" class="c po" data-at="ideal (or non-sensible)"/>`,
      T(450, 625, 'A', { f: 'serif', s: 40, d: .5 }), T(750, 625, 'B', { f: 'serif', s: 40, d: .5 }), T(600, 330, 'C', { f: 'serif', s: 40, at: 'ideal (or non-sensible)' }),
      T(600, 200, 'Elements I.1: on a given line, an equilateral triangle', { s: 34, d: 1, cls: 'f-ink2' }),
      T(600, 790, 'drawn for illustration; proved by reason alone', { s: 36, at: 'reason alone could trace', fill: SIE })
    ) });

  scene({ at: 'This discovery was generalized by philosophy', img: 'euclid', dim: 'dim',
    html: svg(
      `<rect x="120" y="120" width="960" height="600" rx="40" fill="${IND}" opacity="0" class="c wa" style="--o:.14" filter="url(#wash)" data-at="realm of fixed Being"/>`,
      ...[[300, 300], [520, 230], [760, 290], [940, 400], [380, 520], [640, 470], [880, 600], [520, 640]].map(([x, y], i) => {
        const shapes = [`<path d="M${x - 30} ${y + 25} L${x} ${y - 28} L${x + 30} ${y + 25} Z"/>`, `<circle cx="${x}" cy="${y}" r="28"/>`, `<rect x="${x - 25}" y="${y - 25}" width="50" height="50"/>`, `<path d="M${x - 30} ${y} L${x} ${y - 30} L${x + 30} ${y} L${x} ${y + 30} Z"/>`];
        return `<g class="c po ink ind" style="transition-delay:${i * .25}s" data-d=".3">${shapes[i % 4]}</g>`;
      }),
      P('M300 300 L520 230 L760 290 L940 400 L880 600 L520 640 L380 520 L300 300 M520 230 L640 470 L880 600 M380 520 L640 470 L760 290', { cls: 'thin ind slow', d: 1.2 }),
      T(600, 790, 'a realm of fixed Being', { f: 'serif', s: 50, at: 'realm of fixed Being', fill: IND }),
      T(600, 845, 'a complete system of immutable and necessary truth', { s: 34, at: 'complete system of immutable' })
    ) });

  scene({ at: 'If one looks at the foundations of the philosophies', img: 'temple', dim: 'dim',
    html: svg(
      T(600, 100, 'Plato (c. 428–348 BC) · Aristotle (384–322 BC)', { f: 'ui', s: 22, a: 'fa', d: .3, cls: 'f-ink3' }),
      W(600, 220, 330, 75, OCH, { o: .4, at: 'Greek religious and artistic beliefs' }),
      T(600, 235, 'Greek religious and artistic beliefs', { s: 40, at: 'Greek religious and artistic beliefs' }),
      P('M380 300 L560 470 L640 470 L820 300', { at: 'The systematization involved a purification' }),
      T(600, 395, 'purification', { f: 'serif', s: 34, at: 'The systematization involved a purification' }),
      T(1000, 420, 'logic sets the patterns real objects must fit', { s: 30, w: 18, at: 'Logic provided the patterns', cls: 'f-ink2' }),
      T(200, 420, 'myths and grosser superstitions eliminated', { s: 30, w: 18, at: 'elimination of myths', cls: 'f-ink2' }),
      A(570, 480, 360, 610, { at: 'the ideals of science', bend: .1 }), A(630, 480, 840, 610, { at: 'life of reason', bend: -.1 }),
      W(330, 670, 200, 60, IND, { o: .3, at: 'the ideals of science' }), T(330, 685, 'the ideal of science', { f: 'serif', s: 42, at: 'the ideals of science' }),
      W(870, 670, 220, 60, IND, { o: .3, at: 'life of reason' }), T(870, 685, 'the life of reason', { f: 'serif', s: 42, at: 'life of reason' }),
      T(870, 750, 'reason, not custom, guides conduct', { s: 30, at: 'take the place of custom', cls: 'f-ink2' })
    ),
    q: [{ at: 'These two ideals form a permanent contribution', text: 'These two ideals form a permanent contribution to western civilization.', pos: 'bottom', u: 'But with all our gratitude' }] });

  // XIII ─ The price
  scene({ at: 'But with all our gratitude for these enduring gifts', img: 'river', kb: [1.0, 1.1, 0, 0],
    html: svg(
      B(770, 80, 390, 160, { at: 'higher realm of fixed reality' }),
      T(965, 140, 'fixed reality', { f: 'serif', s: 44, at: 'higher realm of fixed reality', fill: IND }),
      T(965, 190, 'the only object of true science', { s: 30, at: 'of which alone true science is possible' }),
      B(40, 660, 420, 160, { at: 'inferior world of changing things' }),
      T(250, 720, 'the world of change', { f: 'serif', s: 44, at: 'inferior world of changing things', fill: SIE }),
      T(250, 770, 'experience and practical matters', { s: 30, at: 'experience and practical matters' })
    ),
    q: [{ at: 'They glorified the invariant', text: 'They glorified the invariant at the expense of change…', pos: 'mid', u: 'It bequeathed the notion' }] });

  scene({ at: 'It bequeathed the notion', img: 'river', dim: 'dim',
    html: svg(
      P('M100 460 L1100 460', { d: .2, arrow: true, cls: 'thin' }),
      T(130, 505, 'before', { f: 'ui', s: 22, a: 'fa', anc: 'start', d: .3, cls: 'f-ink3' }), T(1080, 505, 'after', { f: 'ui', s: 22, a: 'fa', anc: 'end', d: .3, cls: 'f-ink3' }),
      G(`<path d="M560 460 C580 430 620 430 640 460 C620 490 580 490 560 460 Z" class="ink"/><circle cx="600" cy="460" r="10" fill="${INK}"/>`, { d: .4 }),
      T(600, 540, 'the knower', { s: 32, d: .5, cls: 'f-ink2' }),
      `<rect x="160" y="190" width="190" height="130" rx="8" fill="${IND}" opacity="0" class="c wa" style="--o:.4" filter="url(#wash)" data-at="uncover the antecedently real"/>`,
      A(560, 430, 360, 290, { at: 'uncover the antecedently real', cls: 'ind', sw: 3, bend: .1 }),
      T(255, 165, 'the antecedently real', { f: 'serif', s: 40, at: 'uncover the antecedently real', fill: IND }),
      T(255, 370, 'tradition: uncover what is already there', { s: 30, at: 'uncover the antecedently real', anc: 'middle' }),
      A(640, 490, 900, 620, { at: 'to deal with problems as they arise', cls: 'sie', sw: 3, bend: .1 }),
      `<circle cx="960" cy="650" r="70" fill="${SIE}" opacity="0" class="c wa" style="--o:.3" filter="url(#wash)" data-at="to deal with problems as they arise"/>`,
      T(960, 760, 'problems as they arise', { f: 'serif', s: 40, at: 'to deal with problems as they arise', fill: SIE }),
      T(960, 810, 'practical judgment: understanding in order to act', { s: 30, w: 26, at: 'as is the case with our practical judgments' })
    ) });

  scene({ at: 'In fixing this conception of knowledge', img: 'cosmos', dim: 'dim',
    html: svg(
      T(600, 110, 'philosophy’s special task', { f: 'serif', s: 46, d: .3 }),
      W(600, 260, 300, 70, IND, { o: .35, at: 'disclosure of the Real' }), T(600, 275, 'the Real in itself, Being as such', { f: 'serif', s: 42, at: 'disclosure of the Real' }),
      W(600, 430, 250, 55, SIE, { o: .2, at: 'sciences of nature are concerned' }), T(600, 445, 'the sciences of nature', { s: 38, at: 'sciences of nature are concerned' }),
      A(600, 410, 600, 320, { at: 'a higher and more ultimate', cls: 'ind' }),
      T(870, 350, 'higher, more ultimate Being', { s: 30, at: 'a higher and more ultimate', fill: IND }),
      W(600, 640, 230, 55, SIE, { o: .3, at: 'superimpose upon acts' }), T(600, 655, 'human conduct', { s: 40, at: 'superimpose upon acts' }),
      P('M330 300 C220 420 260 560 440 630', { at: 'superimpose upon acts', arrow: true, cls: 'ind' }),
      T(225, 480, 'ends “said to flow from reason”', { s: 30, w: 14, at: 'ends said to flow from the nature of reason', fill: IND }),
      T(600, 770, 'diverted from the purposes experience suggests', { s: 32, at: 'It thus diverted thought', cls: 'f-ink2' })
    ) });

  scene({ at: 'It translated into a rational form the doctrine of escape', img: 'altar', dim: 'dim',
    html: svg(
      T(600, 140, 'escape from the vicissitudes of existence', { f: 'serif', s: 44, d: .3 }),
      T(380, 330, 'rites and cults', { f: 'serif', s: 48, at: 'For deliverance by means of rites' }),
      A(560, 315, 700, 315, { at: 'For deliverance by means of rites' }),
      T(850, 330, 'deliverance', { f: 'serif', s: 48, at: 'For deliverance by means of rites' }),
      P('M240 318 L520 318', { at: 'it substituted deliverance through reason', sw: 4, cls: 'sie' }),
      T(380, 500, 'reason', { f: 'serif', s: 56, at: 'it substituted deliverance through reason', fill: IND }),
      A(560, 485, 700, 485, { at: 'it substituted deliverance through reason', cls: 'ind', sw: 3 }),
      T(850, 500, 'deliverance', { f: 'serif', s: 56, at: 'it substituted deliverance through reason', fill: IND }),
      T(600, 660, 'still “measures which do not demand an active coping with conditions”', { s: 34, w: 40, at: 'which do not demand an active coping', fill: SIE }),
      T(600, 790, 'a theoretical affair, apart from practical activity', { s: 32, at: 'This deliverance was an intellectual', cls: 'f-ink2' })
    ) });

  // XIV ─ Two realms
  (function () {
    const r = (y, label, at) => T(130, y, label, { f: 'ui', s: 22, a: 'fa', anc: 'start', at, cls: 'f-ink3', style: 'letter-spacing:2px' });
    scene({ at: 'The realms of knowledge and action were each divided', img: 'river', dim: 'dim',
      html: svg(
        T(530, 110, 'higher', { f: 'serif', s: 50, fill: IND, d: .3 }), T(910, 110, 'lower', { f: 'serif', s: 50, fill: SIE, d: .5 }),
        P('M720 70 L720 820', { cls: 'thin', d: .5 }), P('M120 145 L1100 145', { cls: 'thin', d: .5 }),
        r(250, 'ACTIVITY', 'But it distinguished activity from'),
        T(530, 240, 'pure activity', { f: 'serif', s: 42, at: 'But it distinguished activity from' }),
        T(530, 290, 'self-enclosed, self-sufficient, eternal', { s: 30, at: 'self-enclosed form of self-originated' }),
        T(910, 240, 'action', { f: 'serif', s: 42, at: 'But it distinguished activity from' }),
        T(910, 290, 'making and doing', { s: 30, at: 'from making and doing' }),
        T(910, 335, 'industry, fine arts, morals, politics', { s: 28, at: 'whether in the industrial or the fine arts' }),
        T(910, 380, '“infected with non-being”', { s: 32, at: 'It is infected with non-being', fill: SIE }),
        P('M120 430 L1100 430', { cls: 'thin', at: 'On the side of knowledge' }),
        r(530, 'KNOWING', 'On the side of knowledge'),
        T(530, 520, 'knowledge', { f: 'serif', s: 42, at: 'between knowledge, in its full sense, and belief' }),
        T(530, 570, 'demonstrative, necessary, sure', { s: 30, at: 'The former is demonstrative' }),
        T(910, 520, 'belief', { f: 'serif', s: 42, at: 'between knowledge, in its full sense, and belief' }),
        T(910, 570, 'opinion, mere probability', { s: 30, at: 'Belief on the contrary is only opinion' }),
        P('M120 640 L1100 640', { cls: 'thin', at: 'relates to the world of change' }),
        r(740, 'WORLD', 'relates to the world of change'),
        T(530, 740, 'true reality', { f: 'serif', s: 42, at: 'realm of true reality' }),
        T(910, 740, 'the world of change', { f: 'serif', s: 42, at: 'relates to the world of change' })
      ) });
  })();

  scene({ at: 'That man has two modes, two dimensions, of belief', img: null,
    html: svg(
      W(300, 400, 200, 190, IND, { o: .3, at: 'beliefs about actual existences' }),
      T(300, 380, 'what is', { f: 'serif', s: 52, at: 'beliefs about actual existences' }),
      T(300, 430, 'beliefs about existences and events', { s: 30, w: 16, at: 'beliefs about actual existences' }),
      T(300, 640, 'vouchsafed by science', { s: 30, at: 'scientific inquiry vouchsafes', fill: IND }),
      W(900, 400, 200, 190, SIE, { o: .3, at: 'beliefs about ends to be striven for' }),
      T(900, 380, 'what is worth it', { f: 'serif', s: 46, at: 'beliefs about ends to be striven for' }),
      T(900, 430, 'ends, policies, goods to attain, evils to avert', { s: 30, w: 16, at: 'policies to be adopted' }),
      A(470, 300, 730, 300, { at: 'used to regulate our practical beliefs', bend: -.15, sw: 3 }), T(600, 225, 'regulate', { s: 36, at: 'used to regulate our practical beliefs' }),
      A(730, 520, 470, 520, { at: 'organize and integrate', bend: -.15, sw: 3 }), T(600, 620, 'organize and integrate', { s: 36, at: 'organize and integrate' }),
      T(600, 110, 'the most urgent of all practical problems', { f: 'serif', s: 42, at: 'The most urgent of all practical problems' }),
      T(600, 160, 'Dewey’s candidate task for philosophy', { s: 32, at: 'one way of conceiving of the function of philosophy', fill: SIE }),
      P('M600 230 L585 280 L615 330 L585 380 L615 430 L585 480 L615 530 L600 580', { at: 'we are estopped', sw: 9, cls: 'slow' }),
      T(600, 760, 'tradition: “no inherent connection”', { s: 40, at: 'have no inherent connection with each other', fill: INK }),
      T(600, 815, '(“estopped”: legally barred)', { f: 'ui', s: 20, a: 'fa', at: 'we are estopped', cls: 'f-ink3' })
    ) });

  scene({ at: 'We may then profitably recapitulate', img: 'decay', kb: [1.0, 1.12, 0, -1],
    html: svg(),
    q: [{ at: 'The realm of the practical is the region of change', text: 'The realm of the practical is the region of change, and change is always contingent…', pos: 'top', u: 'If a thing changes' },
      { at: 'What is, in the full and pregnant sense', text: 'What is, in the full and pregnant sense…, is always, eternally.', pos: 'top', u: 'It is self-contradictory' },
      { at: 'That which becomes merely comes to be', text: 'That which becomes merely comes to be, never truly is.', pos: 'top', u: 'It is infected with non-being' },
      { at: 'Wherever one thing comes into being', text: 'Wherever one thing comes into being something else passes out of being.', pos: 'top' }] });

  // XV ─ The scheme
  scene({ at: 'Thus the depreciation of practice was given', img: 'decay', dim: 'dim',
    html: svg(
      T(600, 120, 'an ontological justification', { f: 'serif', s: 48, at: 'an ontological, justification' }),
      T(600, 165, 'grounded in the nature of being itself', { f: 'ui', s: 22, a: 'fa', at: 'an ontological, justification', cls: 'f-ink3' }),
      W(380, 330, 170, 70, IND, { o: .35, at: 'ultimate Being or reality is fixed' }), T(380, 350, 'fixed', { f: 'serif', s: 60, at: 'ultimate Being or reality is fixed' }),
      T(600, 350, '≡', { f: 'serif', s: 70, at: 'the unalterably fixed and the absolutely certain are one' }),
      W(820, 330, 190, 70, IND, { o: .35, at: 'the unalterably fixed and the absolutely certain are one' }), T(820, 350, 'certain', { f: 'serif', s: 60, at: 'the unalterably fixed and the absolutely certain are one' }),
      T(380, 450, 'grasped by rational intuition', { s: 32, at: 'rational intuition' }),
      T(820, 450, 'demonstrated, like geometry', { s: 32, at: 'universal and necessary, demonstration' }),
      W(380, 600, 170, 70, SIE, { o: .3, at: 'change is the source' }), T(380, 620, 'change', { f: 'serif', s: 60, at: 'change is the source' }),
      T(600, 620, '≡', { f: 'serif', s: 70, at: 'change is the source' }),
      W(820, 600, 220, 70, SIE, { o: .3, at: 'all our uncertainties and woes' }), T(820, 620, 'uncertainty, woe', { f: 'serif', s: 54, at: 'all our uncertainties and woes' }),
      T(600, 770, 'the inchoate feeling, formulated as necessary as geometry', { s: 32, at: 'this inchoate feeling', cls: 'f-ink2' }),
      T(600, 830, 'the common possession of the entire classic tradition', { s: 32, at: 'common possession of the entire classic', fill: IND })
    ) });

  scene({ at: 'All parts of the scheme hang together', img: 'cosmos', kb: [1.0, 1.08, 0, 0],
    html: svg(
      `<g class="spin" style="transform-origin:600px 450px">${G(`<circle cx="600" cy="450" r="420" fill="none" stroke="${OCH}" stroke-width="2" stroke-dasharray="2 14" opacity=".9"/>`, { at: 'unmoved mover' })}</g>`,
      B(830, 30, 340, 150, { at: 'unmoved mover' }),
      T(1000, 90, 'the “unmoved mover”', { f: 'serif', s: 40, at: 'unmoved mover', fill: IND }),
      T(1000, 135, 'complete, perfect, divine', { s: 30, at: 'perfect, divine, immutable' }),
      B(30, 720, 370, 150, { at: 'there are things that change' }),
      T(215, 780, 'things that change', { f: 'serif', s: 40, at: 'there are things that change', fill: SIE }),
      T(215, 825, 'generated and perishing', { s: 30, at: 'generated and perish' }),
      ...[0, 1, 2, 3, 4, 5].map((i) => { const a = i / 6 * Math.PI * 2 + .3; return A(600 + Math.cos(a) * 80, 450 + Math.sin(a) * 80, 600 + Math.cos(a) * 300, 450 + Math.sin(a) * 300, { at: 'aspiration toward a goal', cls: 'flow', sw: 3 }); }),
      T(600, 880, 'striving toward their end', { s: 34, at: 'tend toward an end', fill: OCH })
    ) });

  (function () {
    const rowLab = (y, s, at) => T(150, y, s, { f: 'ui', s: 22, a: 'fa', anc: 'start', at, cls: 'f-ink3', style: 'letter-spacing:2px' });
    scene({ at: 'The perfect and complete is rational thought', img: 'cosmos', dim: 'dim',
      html: svg(
        T(560, 110, 'the higher realm', { f: 'serif', s: 46, fill: IND, d: .3 }), T(930, 110, 'the lower realm', { f: 'serif', s: 46, fill: SIE, at: 'That which changes, which becomes' }),
        P('M745 70 L745 820', { cls: 'thin', d: .5 }),
        rowLab(250, 'BEING', 'The perfect and complete'),
        T(560, 230, 'rational thought', { f: 'serif', s: 40, d: .4 }), T(560, 275, 'perfect, complete, the final “end”', { s: 30, at: 'ultimate “end”' }),
        T(930, 230, 'the material', { f: 'serif', s: 40, at: 'which becomes and passes away, is material' }), T(930, 275, 'change; at best a potentiality', { s: 30, at: 'potentiality of reaching' }),
        P('M140 340 L1100 340', { cls: 'thin', at: 'To these two realms belong' }),
        rowLab(450, 'KNOWING', 'To these two realms belong'),
        T(560, 430, 'science', { f: 'serif', s: 40, at: 'alone knowledge in the full sense' }), T(560, 475, 'rational, necessary, unchanging: certain', { s: 30, at: 'It is certain' }),
        T(930, 430, 'belief, opinion', { f: 'serif', s: 40, at: 'is belief or opinion' }), T(930, 475, 'empirical, particular, probable', { s: 30, at: 'empirical and particular' }),
        T(930, 515, 'true “upon the whole”', { s: 30, at: 'upon the whole', fill: SIE }),
        P('M140 570 L1100 570', { cls: 'thin', at: 'Corresponding to the division in Being' }),
        rowLab(680, 'DOING', 'Corresponding to the division in Being'),
        T(560, 660, 'pure activity', { f: 'serif', s: 40, at: 'Pure activity is rational' }), T(560, 705, 'rational, theoretical', { s: 30, at: 'it is theoretical' }),
        T(930, 660, 'doing and making', { f: 'serif', s: 40, at: 'action in doing and making' }), T(930, 705, 'the needs and defects of the lower realm', { s: 30, w: 22, at: 'needs and defects' })
      ) });
  })();

  // XVI ─ Survives
  (function () {
    const ev = [['Euclid’s Elements', 'c. 300 BC'], ['Copernicus', '1543'], ['Galileo’s telescope', '1610'], ['Newton’s Principia', '1687'],
      ['Watt’s steam engine', '1769'], ['Darwin’s Origin', '1859'], ['relativity', '1905'], ['these lectures', '1929']];
    const X = (i) => 130 + i * 134;
    const parts = [T(600, 100, 'enormous changes in science and the arts…', { f: 'serif', s: 42, at: 'For in spite of the great, the enormous changes' }),
      T(600, 140, 'evenly spaced milestones, not a time scale', { f: 'ui', s: 20, a: 'fa', at: 'For in spite of the great, the enormous changes', cls: 'f-ink3' }),
      P(`M100 420 L1120 420`, { d: .3, cls: 'thin' })];
    ev.forEach(([e, y], i) => {
      const up = i % 2 === 0;
      parts.push(`<circle cx="${X(i)}" cy="420" r="10" fill="${SIE}" stroke="#fbf7ec" stroke-width="3" class="c po" data-at="For in spite of the great, the enormous changes" style="transition-delay:${i * .45}s" data-tip="${e}, ${y}"/>`);
      parts.push(P(`M${X(i)} 410 L${X(i)} ${up ? 330 : 510}`, { at: 'For in spite of the great, the enormous changes', cls: 'thin', style: '' }));
      parts.push(T(X(i), up ? 290 : 560, e, { s: 30, w: 12, vc: true, at: 'For in spite of the great, the enormous changes', style: `transition-delay:${i * .45}s` }));
      parts.push(T(X(i), up ? 240 : 615, y, { f: 'ui', s: 20, a: 'fa', at: 'For in spite of the great, the enormous changes', cls: 'f-ink3', style: `transition-delay:${i * .45}s` }));
    });
    parts.push(`<rect x="100" y="680" width="1020" height="64" rx="32" fill="${IND}" opacity="0" class="c wa" style="--o:.4" filter="url(#wash)" data-at="retained intact this framework of ideas"/>`);
    parts.push(T(610, 724, '…the Greek framework, retained intact', { f: 'serif', s: 40, at: 'retained intact this framework of ideas' }));
    parts.push(T(600, 830, 'knowing “does nothing to the real, except just to know it”', { s: 34, at: 'which does nothing to the real', fill: IND }));
    scene({ at: 'Although this Greek formulation was made long ago', img: 'laboratory', dim: 'dim', html: svg(...parts),
      q: [{ at: 'Perfect certainty is what man wants', text: 'Perfect certainty is what man wants.', pos: 'top', u: 'It cannot be found by practical' }] });
  })();

  scene({ at: 'There is involved in these doctrines', img: null,
    html: svg(
      W(300, 230, 190, 80, IND, { o: .3, at: 'complete correspondence' }), T(300, 250, 'knowledge', { f: 'serif', s: 50, at: 'complete correspondence' }),
      W(900, 230, 190, 80, IND, { o: .3, at: 'complete correspondence' }), T(900, 250, 'reality', { f: 'serif', s: 50, at: 'complete correspondence' }),
      P('M500 235 L700 235', { at: 'complete correspondence', arrow: true, arrow2: true, sw: 3 }),
      T(600, 150, 'complete correspondence', { s: 34, at: 'complete correspondence', cls: 'f-ink2' }),
      ...['affections', 'desire', 'effort', 'choice'].map((v, i) => T(170 + i * 110, 470 + (i % 2) * 50, v, { s: 34, at: ['the affections', 'of desire', 'effort, choice', 'effort, choice'][i], fill: SIE, a: 'po' })),
      P('M640 400 L640 560 M700 400 L700 560', { at: 'validated through knowledge', sw: 4 }),
      A(500, 480, 620, 480, { at: 'approached and validated', cls: 'sie flow' }),
      A(720, 480, 860, 300, { at: 'Yes, if they can be warranted by knowledge', cls: 'sie', bend: .15 }),
      T(670, 600, 'validated by knowledge?', { s: 32, at: 'validated through knowledge' }),
      T(980, 470, 'only then “real”', { s: 32, at: 'we are justified in thinking them real', fill: SIE }),
      B(150, 670, 900, 110, { at: 'the unexpressed premise' }),
      T(600, 720, 'the unexpressed premise:', { f: 'ui', s: 22, a: 'fa', at: 'the unexpressed premise', cls: 'f-ink3' }),
      T(600, 760, 'only the completely fixed and unchanging can be real', { f: 'serif', s: 38, at: 'only the completely fixed', fill: SIE })
    ),
    q: [{ at: 'The quest for certitude has determined', text: 'The quest for certitude has determined our basic metaphysics.', pos: 'mid', u: 'Secondly, the theory of knowledge' }] });

  scene({ at: 'Secondly, the theory of knowledge', img: null,
    html: svg(
      T(600, 110, 'what can be known?', { f: 'serif', s: 48, d: .3 }),
      P('M600 180 L600 640', { d: .4, sw: 4, cls: 'sie' }), T(600, 680, 'our action', { s: 38, d: .5, fill: SIE }),
      P('M120 420 L1080 420', { d: .4, cls: 'thin', arrow: true }),
      W(330, 420, 200, 120, IND, { o: .3, at: 'antecedent existence or essential being' }),
      T(330, 400, 'what exists before', { f: 'serif', s: 40, at: 'antecedent existence or essential being' }),
      T(330, 450, 'the proper object of knowledge', { s: 30, at: 'proper objects of knowledge and science', fill: IND }),
      W(870, 420, 200, 120, SIE, { o: .25, at: 'Things in the production of which we participate' }),
      T(870, 400, 'what we help produce', { f: 'serif', s: 40, at: 'Things in the production of which we participate' }),
      T(870, 450, 'cannot be truly known', { s: 30, at: 'we cannot know in the true sense', fill: SIE }),
      T(870, 560, 'mere guesswork and probability', { s: 32, at: 'mere guesswork and probability' }),
      T(600, 790, 'mind, consciousness and inquiry defined so as to change nothing', { s: 34, w: 40, at: 'controls our conceptions of mind' })
    ) });

  // XVII ─ Spectator
  (function () {
    const bub = [[270, 240, 'sensationalism', 'impressions passively received', 'impressions passively received'], [930, 240, 'Kantian synthesis', 'the synthetic activity of the intellect', 'synthetic activity of the intellect'],
      [270, 700, 'idealism', 'mind and its object are one', 'Idealistic theories hold'], [930, 700, 'realism', 'awareness of what exists independently', 'realistic doctrines reduce']];
    const parts = [];
    bub.forEach(([x, y, n, d, at], i) => {
      parts.push(G(`${W(x, y, 200, 95, i % 2 ? SIE : IND, { o: .25, raw: true })}<g class="jit" style="animation-delay:-${i * .13}s">${T(x, y - 8, n, { f: 'serif', s: 44, raw: true })}${T(x, y + 38, d, { s: 28, w: 22, raw: true })}</g>`, { at, a: 'po' }));
    });
    parts.push(T(600, 470, 'the din…', { s: 40, at: 'The din thus created', u: 'But they all make one common', cls: 'f-ink3', a: 'fa' }));
    parts.push(W(600, 470, 210, 120, OCH, { o: .45, at: 'But they all make one common assumption' }));
    parts.push(T(600, 445, 'one shared assumption', { f: 'serif', s: 38, at: 'But they all make one common assumption' }));
    parts.push(T(600, 490, 'inquiry adds no practical activity to the object known', { s: 28, w: 26, at: 'excludes any element of practical activity' }));
    [[270, 240], [930, 240], [270, 700], [930, 700]].forEach(([x, y]) => parts.push(A(x + (x < 600 ? 150 : -150), y + (y < 450 ? 80 : -80), x < 600 ? 450 : 750, y < 450 ? 400 : 540, { at: 'But they all make one common assumption', cls: 'thin' })));
    parts.push(T(600, 870, 'construction only by “some occult internal operation”', { s: 30, at: 'occult internal operation', cls: 'f-ink2' }));
    scene({ at: 'Special theories of knowledge differ enormously', img: 'spectator', dim: 'dim', html: svg(...parts) });
  })();

  scene({ at: 'The common essence of all these theories', img: 'spectator', dim: 'dim',
    html: svg(
      `<circle cx="760" cy="440" r="210" fill="none" class="c dr ink" stroke-dasharray="1" pathLength="1" stroke-width="3" data-d=".4"/>`,
      `<circle cx="760" cy="440" r="210" fill="none" class="ink thin" stroke-dasharray="4 12" opacity=".4"/>`,
      G(`<path d="M690 420 L760 380 L830 420 L830 500 L760 540 L690 500 Z M690 420 L760 460 L830 420 M760 460 L760 540" class="ink" style="fill:rgba(58,98,168,.18)"/>`, { d: .6, a: 'po' }),
      T(760, 610, 'what is known', { f: 'serif', s: 40, d: .8 }),
      T(760, 300, 'antecedent, unaffected', { s: 34, at: 'antecedent to the mental act', fill: IND }),
      G(`<path d="M190 440 C230 395 300 395 340 440 C300 485 230 485 190 440 Z" class="ink"/><circle cx="265" cy="440" r="16" fill="${INK}"/>`, { at: 'They must be outside what is known', a: 'po' }),
      T(265, 540, 'the knower, outside', { s: 36, at: 'They must be outside what is known' }),
      A(345, 440, 535, 440, { at: 'so as not to interact', cls: 'flow thin' }),
      T(600, 790, '“interaction” may not mean any overt production of change', { s: 32, w: 40, at: 'If the word “interaction” be used', cls: 'f-ink2' })
    ) });

  scene({ at: 'The theory of knowing is modeled after', img: 'spectator', dim: 'half',
    html: svg(
      B(60, 130, 1080, 560, { d: .1, r: 30 }),
      G(`<path d="M150 410 C210 340 330 340 390 410 C330 480 210 480 150 410 Z" class="ink" stroke-width="3"/><circle cx="270" cy="410" r="38" fill="${IND}" opacity=".55"/><circle cx="270" cy="410" r="16" fill="${INK}"/>`, { d: .3, a: 'po' }),
      W(900, 420, 120, 120, OCH, { o: .55, d: .5 }),
      `<circle cx="900" cy="420" r="105" class="c dr ink" pathLength="1" stroke-width="3" data-d=".5"/>`,
      ...[-60, -30, 0, 30, 60].map((dy) => P(`M790 ${420 + dy * .8} L400 ${410 + dy * .25}`, { at: 'refracts light to the eye', arrow: true, cls: 'flow thin' })),
      T(270, 540, 'a difference to the eye', { s: 36, at: 'makes a difference to the eye', fill: IND }),
      T(900, 590, 'none to the thing seen', { s: 36, at: 'but none to the thing seen', fill: SIE }),
      G(`<path d="M840 300 L850 240 L875 275 L900 225 L925 275 L950 240 L960 300 Z" fill="${OCH}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" filter="url(#rough)"/>`, { at: 'regal aloofness', a: 'po' }),
      T(900, 200, '“regal aloofness”', { s: 34, at: 'regal aloofness' }),
      T(600, 790, 'a spectator theory of knowledge', { f: 'serif', s: 60, at: 'A spectator theory of knowledge', fill: SIE }),
      T(600, 845, 'the inevitable outcome', { s: 34, at: 'A spectator theory of knowledge', cls: 'f-ink2' })
    ) });

  scene({ at: 'There have been theories which hold that mental activity intervenes', img: 'spectator', dim: 'dim',
    html: svg(
      G(`<path d="M120 440 C170 385 260 385 310 440 C260 495 170 495 120 440 Z" class="ink" stroke-width="3"/><circle cx="215" cy="440" r="15" fill="${INK}"/>`, { d: .3, a: 'po' }),
      W(960, 440, 110, 110, OCH, { o: .55, d: .4 }), T(960, 600, 'the real object', { f: 'serif', s: 38, d: .5 }),
      `<path d="M600 160 C640 260 560 340 600 440 C640 540 560 620 600 720" stroke="${IND}" stroke-width="44" opacity="0" fill="none" filter="url(#wash)" class="c wa" style="--o:.4" data-at="mental activity intervenes"/>`,
      T(600, 130, 'mind intervenes', { s: 36, at: 'mental activity intervenes', fill: IND }),
      A(840, 440, 650, 440, { at: 'mental activity intervenes', cls: 'thin' }),
      A(550, 440, 330, 440, { at: 'some modified semblance', cls: 'thin flow' }),
      T(430, 380, '“appearance”', { s: 38, at: 'some “appearance.”', fill: SIE }),
      T(600, 800, 'conclusion: reality cannot be known', { f: 'serif', s: 44, at: 'impossible to know reality' }),
      T(600, 855, 'which only shows how firm the old premise is', { s: 32, at: 'It would be hard to find', cls: 'f-ink2' })
    ) });

  // XVIII ─ Root and road
  scene({ at: 'All of these notions about certainty and the fixed', img: 'roots', dim: 'half',
    html: svg(
      B(330, 740, 540, 130, { at: 'the separation (set up' }),
      T(600, 795, 'the separation of theory and practice', { f: 'serif', s: 40, at: 'the separation (set up', fill: SIE }),
      T(600, 840, 'set up for the sake of absolute certainty', { s: 30, at: 'in the interest of the quest for absolute certainty' }),
      ...[[200, 120, 'certainty and the fixed', 'about certainty and the fixed'], [480, 70, 'the real world', 'nature of the real world'], [760, 70, 'mind and its organs of knowing', 'the mind and its organs'], [1030, 130, 'every philosophic question', 'practically all important ideas']]
        .map(([x, y, s, at]) => `${B(x - 140, y - 45, 280, 76, { at, r: 30 })}${T(x, y + 2, s, { s: 30, w: 18, vc: true, at })}`)
    ),
    q: [{ at: 'is my basic', text: 'They all flow (such is my basic thesis) from the separation… between theory and practice, knowledge and actions.', pos: 'mid', u: 'Consequently the later problem' }] });

  (function () {
    const stops = [[180, 700, 'the nature of philosophy, and the place of values', 'the conception of the nature of philosophy'],
      [430, 520, 'modern philosophy: reconciling science with values', 'reconciling the conclusions of natural science'],
      [700, 610, 'how experimental inquiry actually knows', 'analysis of experimental inquiry'],
      [900, 400, 'mind and thought reconstructed', 'reconstruction of the basic ideas about mind'],
      [1040, 200, 'long-standing problems in the theory of knowledge', 'long-standing problems as to the theory']];
    const d = 'M80 820 C200 760 120 700 180 700 S360 500 430 520 S620 640 700 610 S860 440 900 400 S1010 260 1040 200';
    const parts = [T(560, 100, 'the road ahead', { f: 'serif', s: 46, d: .3 }),
      `<path d="${d}" pathLength="1" class="c dr ink slow" stroke-width="5" stroke-dasharray="1" data-d=".5" opacity=".75"/>`,
      `<path d="${d}" class="ink thin" style="stroke:#fbf7ec" stroke-dasharray="8 12" opacity=".8"/>`];
    stops.forEach(([x, y, s, at], i) => {
      parts.push(`<circle cx="${x}" cy="${y}" r="16" fill="${SIE}" stroke="#fbf7ec" stroke-width="4" class="c po" data-at="${at}"/>`);
      const left = i === 4;
      parts.push(T(x + (left ? -30 : 0), y + (i % 2 ? -50 : 60), s, { s: 30, w: 22, at, anc: left ? 'end' : 'middle' }));
    });
    scene({ at: 'In later chapters the theme will, therefore', img: 'laboratory', dim: 'dim', html: svg(...parts),
      q: [{ at: 'For science in becoming experimental', text: 'For science in becoming experimental has itself become a mode of directed practical doing.', pos: 'top', u: 'There will then follow' }] });
  })();

  scene({ at: 'The consequences of substituting search for security', img: 'laboratory', dim: 'half',
    html: svg(
      B(120, 230, 960, 440, { d: .1, r: 30 }),
      T(600, 330, 'the quest for absolute certainty, by cognitive means', { f: 'serif', s: 42, at: 'quest of absolute certainty', fill: IND }),
      P('M190 318 L1010 318', { at: 'by cognitive means will then be considered', sw: 4, cls: 'sie' }),
      A(600, 370, 600, 450, { at: 'search for security by practical means', sw: 3 }),
      T(600, 530, 'search for security, by practical means', { f: 'serif', s: 48, at: 'search for security by practical means', fill: SIE }),
      T(600, 610, 'the values which control conduct, especially its social phases', { s: 32, at: 'especially its social phases', cls: 'f-ink2' }),
      T(600, 760, 'end of Chapter I', { f: 'ui', s: 22, a: 'fa', at: 'especially its social phases', d: 4, cls: 'f-ink3', style: 'letter-spacing:4px' })
    ) });

  /* ────────────────────────────── Glossary ────────────────────────────── */
  const glossary = [
    ['propitiate', 'propitiate', 'To win the favour of a god or power by offerings or acts; to appease.'],
    ['supplication', 'supplication', 'Humble, earnest prayer or entreaty.'],
    ['contrite', 'contrite heart', 'A heart sincerely sorry for wrongdoing; the phrase echoes Psalm 51:17.'],
    ['prerogatives', 'prerogatives', 'Exclusive rights or privileges (here: of the gods).'],
    ['disesteem', 'disesteem', 'Low regard; lack of respect.'],
    ['derogation', 'derogation', 'Disparagement; a lowering in worth or standing.'],
    ['invidious', 'invidious discrimination', 'Unfairly discriminating; drawing distinctions that give offence.'],
    ['expatiate', 'expatiate', 'To speak or write at length.'],
    ['gang agley', 'gang agley', 'Scots: “go awry”. From Robert Burns, “To a Mouse” (1785): “The best-laid schemes o’ mice an’ men / Gang aft agley.”'],
    ['ulterior event', 'ulterior event', 'The further, eventual outcome.'],
    ['per se', 'per se', 'Latin: “in itself”.'],
    ['rôle', 'rôle', 'Old spelling of “role”.'],
    ['untoward', 'untoward', 'Unfavourable, unlucky, inconvenient.'],
    ['harbinger', 'harbinger', 'A forerunner; a sign of what is to come.'],
    ['vicissitudes', 'vicissitudes', 'Changes of fortune, usually for the worse.'],
    ['prognostications', 'prognostications', 'Predictions, forecasts (here: by omens).'],
    ['irruption', 'irruption', 'A sudden, violent bursting in from outside.'],
    ['Noli me tangere', 'Noli me tangere', 'Latin: “Touch me not”, the words of the risen Christ to Mary Magdalene (John 20:17); here, the warning carried by anything holy.'],
    ['tabus', 'Tabus', 'Taboos: prohibitions surrounding things held sacred or dangerous.'],
    ['ambivalent', 'ambivalent', 'Having opposite qualities at once; the holy is both blessing and danger.'],
    ['imprecation', 'imprecation', 'A spoken curse.'],
    ['First Philosophy', 'First Philosophy', 'Aristotle’s name for the study of being as such, the subject later editors called “metaphysics”.'],
    ['demonstrative', 'demonstrative', 'Proved by necessary deduction from first principles, as in geometry.'],
    ['clew', 'clew', 'Old spelling of “clue”; originally the ball of thread that guides one through a labyrinth.'],
    ['estopped', 'estopped', 'A legal term: barred or precluded from taking a position.'],
    ['vouchsafes', 'vouchsafes', 'Grants, gives.'],
    ['privation', 'privation of Being', 'Absence or lack; in classical metaphysics, change implies lacking full Being.'],
    ['ontological', 'ontological', 'Concerning being: what exists and what it is to exist.'],
    ['inchoate', 'inchoate', 'Just begun; not yet fully formed or articulated.'],
    ['unmoved mover', 'unmoved mover', 'Aristotle’s first cause: an eternal, unchanging being that moves everything else as an object of desire, without itself moving.'],
    ['antecedent', 'antecedently real', 'Existing beforehand, independently of our inquiry.'],
    ['occult', 'occult internal operation', 'Hidden or unobservable; not “magical” in this sense.'],
    ['spectator theory', 'spectator theory', 'Dewey’s name for the view that knowing is passively beholding an object that is already complete.'],
    ['ramify', 'ramify', 'To branch out; to spread consequences in many directions.'],
  ];

  window.QFC = { movements, scenes: S, glossary };
})();
