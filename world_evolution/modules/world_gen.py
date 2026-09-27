import math
import random
import colorsys
from modules.database import Tile, GameState, Nation, City, SessionLocal, init_db

def get_distinct_color(index):
    # Generates a distinct color based on hue
    hue = (index * 137.508) % 360 / 360.0
    r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"

def get_valid_start_tile(db, min_dist=12, max_attempts=50):
    flat_tiles = db.query(Tile).filter(Tile.terrain_type == "평원", Tile.owner_id == None).all()
    cities = db.query(City).all()
    
    random.shuffle(flat_tiles)
    for tile in flat_tiles:
        too_close = False
        for c in cities:
            if math.hypot(tile.x - c.x, tile.z - c.z) < min_dist:
                too_close = True
                break
        if not too_close:
            return tile
            
    # If fails, return random
    if flat_tiles: return random.choice(flat_tiles)
    return None

def generate_noise(x, z, scale, octaves=3):
    value = 0
    freq = scale
    amp = 1
    for _ in range(octaves):
        value += math.sin(x * freq) * math.cos(z * freq) * amp
        freq *= 2
        amp /= 2
    return value
    
def get_world_map_elevation(x, z, size):
    nx = x / size
    nz = z / size
    
    # Continents: cx, cz, rx, rz, height
    continents = [
        (0.2, 0.3, 0.15, 0.25, 1.2), # North America
        (0.3, 0.7, 0.1, 0.2, 1.0),   # South America
        (0.65, 0.25, 0.25, 0.2, 1.3),# Eurasia
        (0.55, 0.6, 0.15, 0.2, 1.1), # Africa
        (0.85, 0.8, 0.08, 0.1, 0.9), # Australia
        (0.5, 0.95, 0.4, 0.05, 0.5)  # Antarctica
    ]
    
    max_e = -0.8 # Base Ocean
    for cx, cz, rx, rz, h in continents:
        dx = (nx - cx) / rx
        dz = (nz - cz) / rz
        dist_sq = dx*dx + dz*dz
        if dist_sq < 1.0:
            local_e = h * (1.0 - math.sqrt(dist_sq))
            max_e = max(max_e, local_e)
            
    noise = generate_noise(nx * 20, nz * 20, 1.0) * 0.4
    return max_e + noise

def create_world(map_size=50):
    init_db()
    db = SessionLocal()
    
    if db.query(GameState).first():
        db.close()
        return

    state = GameState(year=1, era="고대", map_size=map_size)
    db.add(state)
    
    for x in range(map_size):
        for z in range(map_size):
            e = get_world_map_elevation(x, z, map_size)
            
            # Map e to terrain types
            terrain = "평원"
            res_type = None
            res_amt = 0.0
            
            if e < -0.6:
                terrain = "바다"
                res_type = "물"
                res_amt = 9999.0
            elif e < -0.4:
                terrain = "사막" # Coast/Desert
                if random.random() < 0.2:
                    res_type = "석유"
                    res_amt = random.randint(80, 250)
                else:
                    res_type = "모래"
                    res_amt = random.randint(80, 300)
            elif e < 0.2:
                terrain = "평원"
                if random.random() < 0.1:
                    res_type = "물"
                    res_amt = random.randint(80, 150)
            elif e < 0.6:
                terrain = "숲"
                res_type = "나무"
                res_amt = random.randint(100, 400)
            elif e < 1.0:
                terrain = "산"
                r = random.random()
                if r < 0.2: res_type = "광석"
                elif r < 0.35: res_type = "석탄"
                elif r < 0.5: res_type = "구리"
                elif r < 0.65: res_type = "은"
                elif r < 0.75: res_type = "돌"
                elif r < 0.85: res_type = "우라늄"
                else: res_type = "미네랄"
                res_amt = random.randint(50, 250)
            else:
                terrain = "눈"
                
            tile = Tile(x=x, z=z, terrain_type=terrain, resource_type=res_type, resource_amount=res_amt)
            db.add(tile)
            
    # Create AI Nations
    for i in range(3):
        c = get_distinct_color(i + 1)
        ai_nation = Nation(name=f"AI 제국 {i+1}", color=c, gold=1000, is_player=False)
        db.add(ai_nation)
        db.commit()
        
        flat_tile = get_valid_start_tile(db, min_dist=12)
        if flat_tile:
            start_city = City(name=f"AI 수도 {i+1}", nation_id=ai_nation.id, x=flat_tile.x, z=flat_tile.z, population=50)
            db.add(start_city)
            # Give AI a 3x3 area
            for dx in range(-1, 2):
                for dz in range(-1, 2):
                    t = db.query(Tile).filter_by(x=flat_tile.x+dx, z=flat_tile.z+dz).first()
                    if t:
                        t.owner_id = ai_nation.id

    db.commit()
    db.close()
    print("World successfully generated and saved to DB.")

def spawn_player(db, user_id, username):
    color = get_distinct_color(user_id * 7 + 5)
    player_nation = Nation(user_id=user_id, name=f"{username}의 제국", color=color, gold=200, is_player=True)
    db.add(player_nation)
    db.commit()
    
    flat_tile = get_valid_start_tile(db, min_dist=10)
    if flat_tile:
        start_city = City(name="수도", nation_id=player_nation.id, x=flat_tile.x, z=flat_tile.z, population=50,
                          wood=50, stone=30, food_wheat=50, food_fruit=20, water=80)
        db.add(start_city)
        # Give Player a 3x3 area
        for dx in range(-1, 2):
            for dz in range(-1, 2):
                t = db.query(Tile).filter_by(x=flat_tile.x+dx, z=flat_tile.z+dz).first()
                if t:
                    t.owner_id = player_nation.id
        db.commit()
