import sys

with open('src/components/ui/editors/RouteClassEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """                 {hasInnerDiv ? (
                   <div style={{
                     width: '100%', height: '100%',
                     backgroundColor: renderBgColor,
                     backgroundImage: bgImage,
                     borderTopLeftRadius: tl, borderTopRightRadius: tr,
                     borderBottomLeftRadius: bl, borderBottomRightRadius: br,
                     borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
                     boxSizing: 'border-box'
                   }}>
                     {arrow && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', fontSize:'12px'}}>{arrow}</div>}
                   </div>
                 ) : (
                   <div style={{
                     width: '100%', height: '100%',
                     borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
                     boxSizing: 'border-box'
                   }}>
                     {arrow && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', fontSize:'12px'}}>{arrow}</div>}
                   </div>
                 )}"""

replacement = """                 {hasInnerDiv ? (
                   <div style={{
                     width: '100%', height: '100%',
                     backgroundColor: renderBgColor,
                     backgroundImage: bgImage,
                     borderTopLeftRadius: tl, borderTopRightRadius: tr,
                     borderBottomLeftRadius: bl, borderBottomRightRadius: br,
                     borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
                     boxSizing: 'border-box'
                   }}>
                     {arrow && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', fontSize:'12px'}}>{arrow}</div>}
                   </div>
                 ) : (
                   <div style={{
                     width: '100%', height: '100%',
                     borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
                     boxSizing: 'border-box',
                     position: 'relative'
                   }}>
                     {arrow && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', fontSize:'12px'}}>{arrow}</div>}
                     {hasPavementHorns && (
                        <>
                           {pTl && <div style={{ position: 'absolute', top: 0, left: 0, width: r, height: r, backgroundColor: pavementColor, borderBottomRightRadius: r, borderBottom: curb, borderRight: curb, boxSizing: 'border-box', zIndex: 5 }} />}
                           {pTr && <div style={{ position: 'absolute', top: 0, right: 0, width: r, height: r, backgroundColor: pavementColor, borderBottomLeftRadius: r, borderBottom: curb, borderLeft: curb, boxSizing: 'border-box', zIndex: 5 }} />}
                           {pBl && <div style={{ position: 'absolute', bottom: 0, left: 0, width: r, height: r, backgroundColor: pavementColor, borderTopRightRadius: r, borderTop: curb, borderRight: curb, boxSizing: 'border-box', zIndex: 5 }} />}
                           {pBr && <div style={{ position: 'absolute', bottom: 0, right: 0, width: r, height: r, backgroundColor: pavementColor, borderTopLeftRadius: r, borderTop: curb, borderLeft: curb, boxSizing: 'border-box', zIndex: 5 }} />}
                        </>
                     )}
                   </div>
                 )}"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/components/ui/editors/RouteClassEditor.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND! DUMPING AROUND LINES:")
    lines = code.split('\\n')
    for i, line in enumerate(lines):
        if 'hasInnerDiv ?' in line:
            for j in range(max(0, i-5), min(len(lines), i+20)):
                print(f"{j}: {repr(lines[j])}")
