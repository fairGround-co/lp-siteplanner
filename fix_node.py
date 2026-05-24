import sys

with open('src/components/ui/IntersectionNode.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('import { RouteClass, RouteElement }', 'import type { RouteClass, RouteElement }')
code = code.replace("import { AppConfig } from '../../store/usePlannerStore';", "import type { AppConfig } from '../../types';")

# Remove isFarSide unused variable
target = 'const isFarSide = h_i > lastDriveIndexH;'
if target in code:
    code = code.replace(target, '')

with open('src/components/ui/IntersectionNode.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
