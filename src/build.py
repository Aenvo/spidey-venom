import subprocess, sys
subprocess.run([sys.executable, 'patch_engine.py'], check=True)
rd = lambda f: open(f, encoding='utf-8').read()
s = rd('engine.js')
s = s.replace("<script>\n'use strict';", "'use strict';", 1)
s = s.replace("  gl.uniform1f(u2.uMorph, hand.m);\n", "  gl.uniform1f(u2.uMorph, hand.m);\n  gl.uniform1f(u2.uTheme, cfg.theme === 'spidey' ? 1 : 0);\n", 1)
open('engine.js', 'w', encoding='utf-8', newline='').write(s)
out = rd('head.html') + rd('fontblob.txt') + '<script>\n' + s + '\n' + rd('controller.js') + '</script>\n</body>\n</html>\n'
open('../index.html', 'w', encoding='utf-8', newline='').write(out)
print('built', len(out))
