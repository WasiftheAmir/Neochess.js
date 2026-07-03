export default {
  input: 'engine/pgn.peggy',
  output: 'engine/pgn.js',
  format: 'es',
  dts: true,
  allowedStartRules: ['pgn'],
  returnTypes: {
    pgn: '{ headers: Record<string, string>, root: import("./node").Node, result?: string }',
  },
}
