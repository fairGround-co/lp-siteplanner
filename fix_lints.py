import os
import re

def remove_unused(filepath, search_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if search_str in content:
        content = content.replace(search_str, '')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def comment_unused(filepath, unused_lines):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for l in unused_lines:
        idx = l - 1
        lines[idx] = '// ' + lines[idx]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)

# ErrorBoundary.tsx
p = 'src/components/ui/ErrorBoundary.tsx'
remove_unused(p, "import React, { Component, ErrorInfo, ReactNode } from 'react';")
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()
c = "import { Component } from 'react';\nimport type { ErrorInfo, ReactNode } from 'react';\n" + c
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

# useSubdivisionSolver.ts
p = 'src/components/map/useSubdivisionSolver.ts'
remove_unused(p, "import { Point, Polygon, BlockGroup, AppState } from '../../types';")
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()
c = "import type { Polygon, BlockGroup, AppState } from '../../types';\n" + c
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

# mathUtils.ts
p = 'src/engine/mathUtils.ts'
remove_unused(p, "import { Vector2D, Point } from '../types';")
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()
c = "import type { Point } from '../types';\n" + c
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

# subdivisionSolver.ts
p = 'src/engine/subdivisionSolver.ts'
remove_unused(p, "import { Polygon, LotGroupInstance, LotClass, Point, Vector2D } from '../types';")
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()
c = "import type { Polygon, LotClass, Point, Vector2D } from '../types';\n" + c
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
remove_unused(p, "import { clipPolygon } from './mathUtils';")
comment_unused(p, [109, 111])

# warpingEngine.ts
p = 'src/engine/warpingEngine.ts'
remove_unused(p, "import { Point, Polygon, Vector2D, BlockGroup } from '../types';")
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()
c = "import type { Polygon, Vector2D, BlockGroup } from '../types';\n" + c
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
comment_unused(p, [105, 107, 108])

