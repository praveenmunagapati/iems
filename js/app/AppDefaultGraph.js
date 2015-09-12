var AppDefaultGraph = {
  id: 0, title: 'Main', type: 'main', category: 'undefined',
  x: 0, y: 0, collapsed: false,
  processes: [
    { id: 1400, x: 131, y: 149, width: 150, height: 50, type: 'opus', params: { srcLang: '$srclang', trgLang: '$trglang' } },
    { id: 1401, x: 262, y: 291, width: 150, height: 50, type: 'tokenizer', params: { lang: '$srclang' } }
  ],
  links: [
    { from: { id: 1400, port: 'src' }, to: { id: 1401, port: 'in' } },
    { from: { id: 1401, port: 'out' }, to: { id: 1402, port: 'trg' } },
    { from: { id: 1400, port: 'src' }, to: { id: 1403, port: 'trg' } }
  ],
  groups: [
    {
      id: 1402, title: 'Language model', type: 'lm-kenlm', category: 'lm',
      x: 292, y: 423, collapsed: true,
      ports: { in: ['trg'], out: ['lm'] },
      processes: [
        { id: 2, x: 20, y: 50, width: 150, height: 50, type: 'kenlm', params: {} },
        { id: 3, x: 20, y: 175, width: 150, height: 50, type: 'binlm', params: {} }
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 1402, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 1402, port: 'lm' } }
      ]
    },
    {
      id: 1403, title: 'Language model', type: 'lm-kenlm', category: 'lm',
      x: 69, y: 356, collapsed: true,
      ports: { in: ['trg'], out: ['lm'] },
      processes: [
        { id: 2, x: 20, y: 50, width: 150, height: 50, type: 'kenlm', params: {} },
        { id: 3, x: 20, y: 175, width: 150, height: 50, type: 'binlm', params: {} }
      ],
      links: [
        { from: { id: 2, port: 'out' }, to: { id: 3, port: 'in' } },
        { from: { id: 1403, port: 'trg' }, to: { id: 2, port: 'in' } },
        { from: { id: 3, port: 'out' }, to: { id: 1403, port: 'lm' } }
      ]
    }
  ]
}
