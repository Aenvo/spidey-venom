import subprocess, sys
subprocess.run([sys.executable, 'patch_engine.py'], check=True)
rd = lambda f: open(f, encoding='utf-8').read()
s = rd('engine.js')
s = s.replace("<script>\n'use strict';", "'use strict';", 1)
open('engine.js', 'w', encoding='utf-8', newline='').write(s)
out = rd('head.html') + rd('fontblob.txt') + '<script>\n' + rd('themes.js') + '\n' + s + '\n' + rd('electricity.js') + '\n' + rd('controller.js') + '</script>\n</body>\n</html>\n'
open('../index.html', 'w', encoding='utf-8', newline='').write(out)
print('built', len(out))
