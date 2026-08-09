import React from 'react';

/** Sprite pixel disegnati inline in SVG, flat e a blocchi (niente anti-aliasing). */

function S({ children, size = 18, color = 'currentColor', title, vb = 16, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <g fill={color}>{children}</g>
    </svg>
  );
}

function grid(rows) {
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ' ') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.06} height={1.06} />);
  });
  return rects;
}

const COIN = [
  '    ######      ',
  '   ########     ',
  '  ###    ###    ',
  ' ##   ##   ##   ',
  ' ##   ##   ##   ',
  ' ##   ##   ##   ',
  '  ###    ###    ',
  '   ########     ',
  '    ######      ',
];

const STAR = [
  '       ##       ',
  '       ##       ',
  '      ####      ',
  '  ###########   ',
  '############### ',
  ' #############  ',
  '  ###########   ',
  '   #### ####    ',
  '   ##     ##    ',
  '  ##       ##   ',
];

const HEART = [
  '  ##    ##      ',
  ' ####  ####     ',
  '##############  ',
  '##############  ',
  '##############  ',
  ' ############   ',
  '  ##########    ',
  '   ########     ',
  '    ######      ',
  '     ####       ',
  '      ##        ',
];

const USERS = [
  '   ##      ##   ',
  '  ####    ####  ',
  '  ####    ####  ',
  '   ##      ##   ',
  '  ###########   ',
  ' #############  ',
  '############### ',
  '### ### ### ### ',
];

const CHEF = [
  '    ######      ',
  '   ########     ',
  '  ##########    ',
  '  ##########    ',
  '   ########     ',
  ' ################',
  ' #  #  #  #  # #',
  ' ################',
];

const FORK = [
  '  ##    ##      ',
  '  ##    ##      ',
  '  ##    ##      ',
  '  ########      ',
  '     ##         ',
  '     ##         ',
  '     ##         ',
  '     ##         ',
];

const MEGA = [
  '       ##       ',
  '      ####      ',
  '     ######     ',
  '    ########    ',
  '   ##########   ',
  '  ####  #####   ',
  ' ##       ###   ',
  '##         ##   ',
];

const SPARK = [
  '       ##       ',
  '   ##  ##  ##   ',
  '    #######     ',
  '  ###########   ',
  '  ###########   ',
  '    #######     ',
  '   ##  ##  ##   ',
  '       ##       ',
];

const CART = [
  '        ##      ',
  '       ####     ',
  '        ##      ',
  '  ############  ',
  '  #  #  #  #  # ',
  '  ############  ',
  '    ##    ##    ',
  '   ####  ####   ',
];

const TAG = [
  '########        ',
  '#      ####     ',
  '#       ###     ',
  '#      ####     ',
  '########        ',
  '  #             ',
  ' ##             ',
  '  #             ',
];

const WRENCH = [
  ' ####           ',
  ' ####           ',
  '  ####          ',
  '   ####         ',
  '     ####       ',
  '  #####  ###    ',
  '  ####    ##    ',
  '   ###    ##    ',
];

const CAL = [
  ' ################',
  ' #  ###  ###  #  ',
  ' ################',
  ' #  #  #  #  #  #',
  ' #  #  #  #  #  #',
  ' ################',
  ' #  #  #  #  #  #',
  ' ################',
];

const CHART = [
  ' ################',
  ' #             #',
  ' #    ##       #',
  ' #    ##  ##   #',
  ' # ## ##  ##   #',
  ' # ## ##  #### #',
  ' # ## ##  #### #',
  ' ################',
];

const ENVELOPE = [
  ' ################',
  ' #  #       #  #',
  ' #    #   #    #',
  ' #      #      #',
  ' #     # #     #',
  ' #   #     #   #',
  ' #  #       #  #',
  ' ################',
];

const SKULL = [
  '    ########    ',
  '  ############  ',
  ' ############## ',
  ' ## ##    ## ## ',
  ' ## ##    ## ## ',
  ' ##   ####   ## ',
  '  ### #### ###  ',
  '    ##    ##    ',
];

const WIFI = [
  '       ##       ',
  '     ######     ',
  '   ####  ####   ',
  '  ####    ####  ',
  ' ####      #### ',
  '       ##       ',
];

const LEAF = [
  '    ######      ',
  '   ########     ',
  '  ####  ###     ',
  ' ####    ##     ',
  ' ####    ##     ',
  '  ####  ###     ',
  '   ########     ',
  '    ######      ',
];

const MAP = {
  coin: COIN, star: STAR, heart: HEART, users: USERS, chef: CHEF, fork: FORK,
  mega: MEGA, spark: SPARK, cart: CART, tag: TAG, wrench: WRENCH, cal: CAL,
  chart: CHART, envelope: ENVELOPE, skull: SKULL, wifi: WIFI, leaf: LEAF,
};

export function Icon({ name, size = 18, color = 'currentColor', title, className }) {
  const data = MAP[name];
  if (!data) return null;
  return (
    <S size={size} color={color} title={title} className={className} vb={16}>
      {grid(data)}
    </S>
  );
}