import math
import random
from sqlalchemy.orm import Session
from .database import GameState, Nation, City, Tile, Building, Task, Unit
from .world_gen import generate_noise

ERAS = ["고대", "중세", "근대", "현대", "미래"]

def expand_world(db: Session, state: GameState):
    old_size = state.map_size
    new_size = old_size + 20
    state.map_size = new_size
    
    ox = random.uniform(0, 100)
    oz = random.uniform(0, 100)
    
    for x in range(new_size):
        for z in range(new_size):
            if x < old_size and z < old_size:
                continue # Already exists
            nx = (x + ox) * 0.1
            nz = (z + oz) * 0.1
            
            terrain = "평원"
            res_type = None
            res_amt = 0.0
            
            if state.era == "미래":
                # Space Generation
                e = generate_noise(nx * 2, nz * 2, 1.0)
                if e < 0.6:
                    terrain = "우주"
                    if random.random() < 0.05:
                        res_type = "암흑물질"
                        res_amt = random.randint(100, 500)
                else:
                    terrain = "행성"
                    if random.random() < 0.4:
                        res_type = "티타늄"
                        res_amt = random.randint(1000, 5000)
                    else:
                        res_type = "광석"
                        res_amt = random.randint(1000, 3000)
            else:
                e = generate_noise(nx, nz, 1.0)
                e += generate_noise(nx + 5.3, nz + 2.1, 2.5) * 0.5
                if e < -0.6: terrain = "바다"
                elif e < -0.4: terrain = "사막"
                elif e < 0.2: terrain = "평원"
                elif e < 0.6:
                    terrain = "숲"
                    res_type = "나무"
                    res_amt = random.randint(500, 2000)
                elif e < 1.0:
                    terrain = "산"
                    res_type = "광석"
                    res_amt = random.randint(300, 1500)
                else: terrain = "눈"
            
            tile = Tile(x=x, z=z, terrain_type=terrain, resource_type=res_type, resource_amount=res_amt)
            db.add(tile)
    
    # Add a new AI nation
    import colorsys
    c_idx = state.map_size # Use map size as an index to ensure unique color
    hue = (c_idx * 137.508) % 360 / 360.0
    r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
    color = f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
    
    new_nation = Nation(name=f"신대륙 제국 {state.year}", color=color, gold=1000)
    db.add(new_nation)
    db.commit()
    
    # Spawn AI city
    flat_tiles = db.query(Tile).filter(Tile.terrain_type == "평원", Tile.x >= old_size).all()
    if flat_tiles:
        flat_tile = random.choice(flat_tiles) # The new continent is empty, so random choice is fine, it won't be near players
        c = City(name=f"{new_nation.name} 수도", nation_id=new_nation.id, x=flat_tile.x, z=flat_tile.z, population=100)
        db.add(c)
    db.commit()


def run_simulation_step(db: Session):
    state = db.query(GameState).first()
    if not state: return
    
    state.year += 1
    
    # Cleanup dead AI nations
    for n in db.query(Nation).all():
        if not n.is_player:
            c_count = db.query(City).filter(City.nation_id == n.id).count()
            t_count = db.query(Tile).filter(Tile.owner_id == n.id).count()
            if c_count == 0 and t_count == 0:
                db.delete(n)
    db.commit()
    
    nations = db.query(Nation).all()
    active_nations_count = len(nations)
    
    # Era Progression & Map Expansion (Conquest Victory on current map)
    if active_nations_count == 1:
        current_era_idx = ERAS.index(state.era) if state.era in ERAS else 0
        if current_era_idx < len(ERAS) - 1:
            state.era = ERAS[current_era_idx + 1]
            expand_world(db, state) # This adds a new AI nation, so active_nations_count will increase
    
    # Weather System
    if state.year % 5 == 0:
        weathers = ["맑음", "맑음", "맑음", "비", "폭풍", "가뭄"]
        if state.era in ["현대", "미래"]: weathers.append("방사능 낙진")
        state.weather = random.choice(weathers)
    
    cities = db.query(City).all()
    
    for city in cities:
        # Tech bonuses
        food_bonus = 1.2 if city.nation.tech_irrigation else 1.0
        iron_bonus = 1.5 if city.nation.tech_iron_smelting else 1.0
        prod_bonus = 2.0 if city.nation.tech_assembly_line else 1.0
        
        # Era Food Multiplier
        era_food_mult = 0.5
        if state.era == "중세": era_food_mult = 0.8
        elif state.era == "근대": era_food_mult = 1.2
        elif state.era == "현대": era_food_mult = 1.5
        elif state.era == "미래": era_food_mult = 2.0
        
        # Weather effects
        weather_food_mod = 1.0
        if state.weather == "폭풍": weather_food_mod = 0.5
        elif state.weather == "가뭄": weather_food_mod = 0.2
        elif state.weather == "비": weather_food_mod = 1.2
        
        # Food Stats (Satiety, Nutrition)
        FOOD_STATS = {
            'wheat': (1.0, 0.5), 'rice': (1.2, 0.6), 'corn': (1.1, 0.4), 'potato': (1.5, 0.3), 'fruit': (0.5, 2.0),
            'beef': (2.5, 1.5), 'pork': (2.0, 1.2), 'chicken': (1.5, 1.0), 'fish': (1.5, 1.2), 'milk': (0.8, 1.0),
            'cheese': (3.0, 2.0), 'bread': (2.5, 1.0), 'sausage': (3.5, 1.5), 'wine': (1.0, 3.0),
            'steak': (5.0, 3.0), 'canned_fish': (2.0, 1.0), 'stew': (4.0, 2.5)
        }
        
        # Basic consumption
        food_consumed = city.population * era_food_mult
        
        available_foods = {
            'wheat': city.food_wheat, 'rice': city.food_rice, 'corn': city.food_corn, 'potato': city.food_potato, 'fruit': city.food_fruit,
            'beef': city.food_beef, 'pork': city.food_pork, 'chicken': city.food_chicken, 'fish': city.food_fish, 'milk': city.food_milk,
            'cheese': city.food_cheese, 'bread': city.food_bread, 'sausage': city.food_sausage, 'wine': city.food_wine,
            'steak': city.food_steak, 'canned_fish': city.food_canned_fish, 'stew': city.food_stew
        }
        
        total_satiety_avail = sum(amt * FOOD_STATS[k][0] for k, amt in available_foods.items())
        total_nutrition_avail = sum(amt * FOOD_STATS[k][1] for k, amt in available_foods.items())
        
        nutrition_eaten = 0.0
        
        if total_satiety_avail <= food_consumed:
            # Eat everything available
            nutrition_eaten = total_nutrition_avail
            for k in available_foods: setattr(city, f'food_{k}', 0.0)
            
            # Starvation
            starved_ratio = 1.0 - (total_satiety_avail / max(1.0, food_consumed))
            starved = math.floor(city.population * 0.1 * starved_ratio)
            weather_deaths = 0
            if state.weather == "폭풍": weather_deaths = math.floor(city.population * 0.01)
            elif state.weather == "가뭄": weather_deaths = math.floor(city.population * 0.02)
            elif state.weather == "방사능 낙진": weather_deaths = math.floor(city.population * 0.1)
            
            city.population = max(0, city.population - starved - weather_deaths)
        else:
            # Eat proportionally
            ratio = food_consumed / total_satiety_avail
            for k in available_foods:
                eaten_amt = available_foods[k] * ratio
                setattr(city, f'food_{k}', getattr(city, f'food_{k}') - eaten_amt)
                nutrition_eaten += eaten_amt * FOOD_STATS[k][1]
                
            nutrition_per_capita = nutrition_eaten / max(1.0, city.population)
            birth_mod = 1.0 + (nutrition_per_capita * 0.5) # Nutrition boosts birth
            
            births = math.floor(city.population * 0.05 * food_bonus * birth_mod)
            natural_deaths = math.floor(city.population * 0.02)
            
            weather_deaths = 0
            if state.weather == "폭풍": weather_deaths = math.floor(city.population * 0.01)
            elif state.weather == "가뭄": weather_deaths = math.floor(city.population * 0.02)
            elif state.weather == "방사능 낙진": weather_deaths = math.floor(city.population * 0.1)
            
            city.population += max(1, births) - natural_deaths - weather_deaths
            
        city.population = max(0, city.population)
        
        # Idle population constraint for workers
        if city.working_population > city.population:
            city.working_population = city.population # Cap it if starved
            
        # Base production (wild gathering)
        city.food_fruit += 10 * food_bonus * weather_food_mod
        
        # Building Production
        for b in city.buildings:
            if b.b_type == '밀 농장': city.food_wheat += 50 * food_bonus * weather_food_mod
            elif b.b_type == '쌀 농장': city.food_rice += 40 * food_bonus * weather_food_mod
            elif b.b_type == '옥수수 농장': city.food_corn += 60 * food_bonus * weather_food_mod
            elif b.b_type == '감자 농장': city.food_potato += 70 * food_bonus * weather_food_mod
            elif b.b_type == '과수원': city.food_fruit += 60 * food_bonus * weather_food_mod
            elif b.b_type == '소 목장': 
                city.food_beef += 30 * food_bonus * weather_food_mod
                city.food_milk += 20 * food_bonus * weather_food_mod
            elif b.b_type == '돼지 농장': city.food_pork += 35 * food_bonus * weather_food_mod
            elif b.b_type == '양계장': city.food_chicken += 40 * food_bonus * weather_food_mod
            elif b.b_type == '어장': city.food_fish += 50 * food_bonus * weather_food_mod
            elif '벌목장' in b.b_type:
                tier = int(b.b_type.split('티어')[0][-1]) if '티어' in b.b_type else 1
                city.wood += (10 * tier) * prod_bonus
            elif '광산' in b.b_type:
                tier = int(b.b_type.split('티어')[0][-1]) if '티어' in b.b_type else 1
                city.stone += (10 * tier) * prod_bonus
                city.iron += (5 * tier) * iron_bonus * prod_bonus
                if tier >= 3:
                    city.mineral += 5 * prod_bonus
                if tier >= 4:
                    city.silver += 2 * prod_bonus
            elif '도예공방' in b.b_type:
                city.brick += 5 * prod_bonus
            elif '유리공방' in b.b_type:
                city.glass += 5 * prod_bonus
            elif '제사단' in b.b_type:
                p_nation = db.query(Nation).filter_by(id=city.nation_id).first()
                if p_nation: p_nation.gold += 10
            elif '시장' in b.b_type or '은행' in b.b_type:
                tier = int(b.b_type.split('티어')[0][-1]) if '티어' in b.b_type else 1
                p_nation = db.query(Nation).filter_by(id=city.nation_id).first()
                if p_nation: p_nation.gold += (20 * tier)
        
        # Tile Harvesting (Range 2) - only owned tiles
        tiles_in_range = db.query(Tile).filter(
            Tile.owner_id == city.nation_id,
            Tile.x >= city.x - 2, Tile.x <= city.x + 2,
            Tile.z >= city.z - 2, Tile.z <= city.z + 2
        ).all()
        
        for t in tiles_in_range:
            # Harvest
            if t.resource_amount > 0:
                base_harvest = 10.0
                if t.resource_type == "광석": base_harvest *= iron_bonus
                harvest_amt = min(t.resource_amount, base_harvest) # Harvest 20 per turn
                t.resource_amount -= harvest_amt
                
                if t.resource_type == "나무":
                    city.wood += harvest_amt
                elif t.resource_type == "광석":
                    city.iron += harvest_amt
                elif t.resource_type == "돌":
                    city.stone += harvest_amt
                elif t.resource_type == "미네랄":
                    city.mineral += harvest_amt
                elif t.resource_type == "구리":
                    city.copper += harvest_amt
                elif t.resource_type == "은":
                    city.silver += harvest_amt
                elif t.resource_type == "석탄":
                    city.coal += harvest_amt
                elif t.resource_type == "석유":
                    city.oil += harvest_amt
                elif t.resource_type == "우라늄":
                    city.uranium += harvest_amt
                elif t.resource_type == "물":
                    city.water += harvest_amt
    
        if city.wood >= 10:
            city.wood -= 10
            city.paper += 5 * prod_bonus
        if city.stone >= 10:
            city.stone -= 10
            
        # Food Processing
        if city.food_milk >= 2:
            city.food_milk -= 2
            city.food_cheese += 1 * prod_bonus
        if city.food_wheat >= 2 and city.water >= 1:
            city.food_wheat -= 2
            city.water -= 1
            city.food_bread += 1 * prod_bonus
        if city.food_pork >= 2 and city.mineral >= 1:
            city.food_pork -= 2
            city.mineral -= 1
            city.food_sausage += 2 * prod_bonus
        if city.food_fruit >= 3:
            city.food_fruit -= 3
            city.food_wine += 1 * prod_bonus
        if city.food_beef >= 2 and city.mineral >= 1:
            city.food_beef -= 2
            city.mineral -= 1
            city.food_steak += 1 * prod_bonus
        if city.food_fish >= 2 and city.iron >= 1:
            city.food_fish -= 2
            city.iron -= 1
            city.food_canned_fish += 2 * prod_bonus
        if city.food_potato >= 2 and city.water >= 1:
            if city.food_beef >= 1:
                city.food_beef -= 1; city.food_potato -= 2; city.water -= 1
                city.food_stew += 2 * prod_bonus
            elif city.food_pork >= 1:
                city.food_pork -= 1; city.food_potato -= 2; city.water -= 1
                city.food_stew += 2 * prod_bonus
            elif city.food_chicken >= 1:
                city.food_chicken -= 1; city.food_potato -= 2; city.water -= 1
                city.food_stew += 2 * prod_bonus
            city.cut_stone += 5 * prod_bonus
            
        # Multi-resource complex processing (여러 자원을 같이 가공)
        if city.stone >= 5 and city.mineral >= 5 and city.water >= 10:
            city.stone -= 5
            city.mineral -= 5
            city.water -= 10
            city.silver += 2 * prod_bonus
            city.copper += 2 * prod_bonus

        # 1. 벽돌 (Brick) = 갈은돌 2 + 물 1
        if city.cut_stone >= 2 and city.water >= 1:
            city.cut_stone -= 2
            city.water -= 1
            city.brick += 2 * prod_bonus
            
        # 2. 청동 (Bronze) = 철 2 + 구리 2
        if city.iron >= 2 and city.copper >= 2:
            city.iron -= 2
            city.copper -= 2
            city.bronze += 1 * prod_bonus
            
        # 3. 화약 (Gunpowder) = 석탄 2 + 미네랄 1
        if city.coal >= 2 and city.mineral >= 1:
            city.coal -= 2
            city.mineral -= 1
            city.gunpowder += 2 * prod_bonus
            
        # 4. 유리 (Glass) = 돌 2 + 물 1 + 불(임의로 미네랄)
        if city.stone >= 2 and city.water >= 1 and city.mineral >= 1:
            city.stone -= 2
            city.water -= 1
            city.mineral -= 1
            city.glass += 2 * prod_bonus
            
        # 5. 가솔린 (Gasoline) = 석유 3 + 물 1
        if city.oil >= 3 and city.water >= 1:
            city.oil -= 3
            city.water -= 1
            city.gasoline += 2 * prod_bonus
            
        # 6. 농축우라늄 (Enriched Uranium) = 우라늄 5 + 물 2 + 미네랄 2
        if city.uranium >= 5 and city.water >= 2 and city.mineral >= 2:
            city.uranium -= 5
            city.water -= 2
            city.mineral -= 2
            city.enriched_uranium += 1 * prod_bonus
            
        # 7. 강철 (Steel) = 철 3 + 석탄 2
        if city.iron >= 3 and city.coal >= 2:
            city.iron -= 3
            city.coal -= 2
            city.steel += 2 * prod_bonus
            
        # 8. 합금 (Alloy) = 강철 2 + 청동 2 + 은 1
        if city.steel >= 2 and city.bronze >= 2 and city.silver >= 1:
            city.steel -= 2
            city.bronze -= 2
            city.silver -= 1
            city.alloy += 1 * prod_bonus
            
        # 4. 고급부품 (Advanced Part) = 합금 1 + 미네랄 2 + 은 1
        if city.alloy >= 1 and city.mineral >= 2 and city.silver >= 1:
            city.alloy -= 1
            city.mineral -= 2
            city.silver -= 1
            city.advanced_part += 1
            
        # 5. 플라스틱 (Plastic) = 물 5 + 미네랄 1
        if city.water >= 5 and city.mineral >= 1:
            city.water -= 5
            city.mineral -= 1
            city.plastic += 2
            
        # 6. 반도체 (Semiconductor) = 구리 2 + 미네랄 2 + 물 2
        if city.copper >= 2 and city.mineral >= 2 and city.water >= 2:
            city.copper -= 2
            city.mineral -= 2
            city.water -= 2
            city.semiconductor += 1
            
        # 7. 인공지능 칩 (AI Chip) = 반도체 2 + 은 2
        if city.semiconductor >= 2 and city.silver >= 2:
            city.semiconductor -= 2
            city.silver -= 2
            city.ai_chip += 1
            
        # 8. 에너지 코어 (Energy Core) = 합금 2 + 고급부품 1 + 플라스틱 5
        if city.alloy >= 2 and city.advanced_part >= 1 and city.plastic >= 5:
            city.alloy -= 2
            city.advanced_part -= 1
            city.plastic -= 5
            city.energy_core += 1
            
        # 9. 복합소재 (Composite) = 플라스틱 2 + 티타늄 2 + 강철 2
        if city.plastic >= 2 and city.titanium >= 2 and city.steel >= 2:
            city.plastic -= 2
            city.titanium -= 2
            city.steel -= 2
            city.composite += 2 * prod_bonus
            
        # 10. 워프 드라이브 (Warp Drive) = 에너지코어 2 + 암흑물질 5 + AI칩 2
        if city.energy_core >= 2 and city.dark_matter >= 5 and city.ai_chip >= 2:
            city.energy_core -= 2
            city.dark_matter -= 5
            city.ai_chip -= 2
            city.warp_drive += 1 * prod_bonus
            
    # Process Tasks
    world_changed = False
    tasks = db.query(Task).all()
    for task in tasks:
        task.time_remaining -= 1
        if task.time_remaining <= 0:
            world_changed = True
            p_city = db.query(City).filter_by(id=task.city_id).first()
            p_nation = db.query(Nation).filter_by(id=task.nation_id).first()
            
            # Return labor
            if p_city:
                p_city.working_population = max(0, (p_city.working_population or 0) - task.labor_assigned)
                
            if task.task_type == 'build':
                if task.target_name in ['원시전사', '투창병', '기사', '장궁병', '투석기', '머스킷병', '대포', '소총수', '탱크', '헬기', '비행기', '항공모함', '함포', '강화외골격병', '플라즈마전차', '전투로봇', '우주전함']:
                    u = Unit(nation_id=task.nation_id, u_type=task.target_name, x=task.target_x, z=task.target_z, target_x=task.target_x + random.randint(-5,5), target_z=task.target_z + random.randint(-5,5))
                    db.add(u)
                    if p_city:
                        p_city.soldiers = (p_city.soldiers or 0) + 10
                else:
                    new_b = Building(city_id=task.city_id, b_type=task.target_name, x=task.target_x, z=task.target_z)
                    db.add(new_b)
            elif task.task_type == 'research':
                if p_nation:
                    setattr(p_nation, task.target_name, True)
            elif task.task_type == 'expand':
                t = db.query(Tile).filter_by(x=task.target_x, z=task.target_z).first()
                if t and t.owner_id is None:
                    t.owner_id = task.nation_id
            elif task.task_type == 'conquer':
                t = db.query(Tile).filter_by(x=task.target_x, z=task.target_z).first()
                if t and t.owner_id != task.nation_id:
                    # Combat resolution
                    if random.random() < 0.5:
                        # Win
                        for dx in range(-1, 2):
                            for dz in range(-1, 2):
                                adj_t = db.query(Tile).filter_by(x=task.target_x+dx, z=task.target_z+dz).first()
                                if adj_t and adj_t.owner_id == t.owner_id:
                                    adj_t.owner_id = task.nation_id
                                    # Destroy enemy city on this tile
                                    enemy_c = db.query(City).filter_by(x=adj_t.x, z=adj_t.z).first()
                                    if enemy_c and enemy_c.nation_id != task.nation_id:
                                        db.delete(enemy_c)
                        # Return surviving troops
                        if p_city: p_city.soldiers = (p_city.soldiers or 0) + max(0, task.labor_assigned - random.randint(1, 5))
                    else:
                        # Lose troops
                        if p_city: p_city.population = max(0, p_city.population - random.randint(3, 8))
            
            db.delete(task)

    # AI Logic
    for nation in nations:
        if not nation.is_player:
            # AI randomly decides to build cities if rich
            if nation.gold > 500:
                nation.gold -= 500
                flat_tiles = db.query(Tile).filter(Tile.terrain_type == "평원", Tile.owner_id == None).all()
                if flat_tiles:
                    free_tile = random.choice(flat_tiles)
                    new_city = City(name=f"{nation.name} 확장시", nation_id=nation.id, x=free_tile.x, z=free_tile.z, population=50)
                    db.add(new_city)
            
            # AI logic to expand borders
            my_tiles = db.query(Tile).filter(Tile.owner_id == nation.id).all()
            if my_tiles and random.random() < 0.4: # 40% chance to expand (increased)
                base_t = random.choice(my_tiles)
                adj = db.query(Tile).filter(
                    Tile.owner_id == None,
                    Tile.x.between(base_t.x-1, base_t.x+1),
                    Tile.z.between(base_t.z-1, base_t.z+1)
                ).first()
                if adj:
                    adj.owner_id = nation.id
                    
            # AI logic to build buildings (NEW)
            my_cities = [c for c in cities if c.nation_id == nation.id]
            if my_cities and my_tiles and random.random() < 0.3: # 30% chance to build resource building
                spawn_city = random.choice(my_cities)
                build_t = random.choice(my_tiles)
                # Check if empty
                if not db.query(Building).filter_by(x=build_t.x, z=build_t.z).first():
                    b_types = []
                    if build_t.terrain_type == '평원': b_types.append('농장(1티어)')
                    if build_t.terrain_type == '숲': b_types.append('벌목장(1티어)')
                    if build_t.terrain_type == '산': b_types.append('광산(1티어)')
                    if b_types:
                        db.add(Building(city_id=spawn_city.id, b_type=random.choice(b_types), x=build_t.x, z=build_t.z))
            
            # AI logic to spawn military and declare war/attack
            if len(my_cities) > 0 and random.random() < 0.2: # 20% chance per turn (increased)
                spawn_city = random.choice(my_cities)
                
                # Give abstract soldiers as well so AI has army power for stats
                spawn_city.soldiers = (spawn_city.soldiers or 0) + 10
                
                types = ['원시전사', '투창병', '기사', '장궁병', '투석기', '머스킷병', '대포', '소총수', '탱크', '헬기', '강화외골격병', '플라즈마전차', '전투로봇']
                u_type = random.choice(types)
                
                target_x, target_z = spawn_city.x + random.randint(-5, 5), spawn_city.z + random.randint(-5, 5)
                # 30% chance to attack another nation (AI declaring war on player or other AI)
                if random.random() < 0.3:
                    enemy_cities = [c for c in cities if c.nation_id != nation.id]
                    if enemy_cities:
                        target_c = random.choice(enemy_cities)
                        target_x, target_z = target_c.x, target_c.z
                        
                unit = Unit(nation_id=nation.id, u_type=u_type, x=spawn_city.x, z=spawn_city.z, target_x=target_x, target_z=target_z)
                db.add(unit)

    # Unit movement & combat
    units = db.query(Unit).all()
    # counters: key defeats value (4x damage)
    counters = {
        '투창병': ['원시전사', '소총수'],
        '기사': ['투창병', '장궁병'],
        '장궁병': ['기사', '머스킷병'],
        '머스킷병': ['원시전사', '투창병'],
        '대포': ['기사', '장궁병', '성(2티어)', '요새(3티어)'],
        '소총수': ['머스킷병'],
        '탱크': ['소총수', '머스킷병', '대포', '강화외골격병'],
        '헬기': ['탱크', '대포', '기사'],
        '강화외골격병': ['소총수', '기사', '헬기'],
        '플라즈마전차': ['탱크', '강화외골격병', '전투로봇'],
        '전투로봇': ['헬기', '플라즈마전차', '탱크']
    }
    
    for u in units:
        if u.target_x is not None and u.target_z is not None:
            # Move towards target
            dx = u.target_x - u.x
            dz = u.target_z - u.z
            dist = math.hypot(dx, dz)
            if dist > 0.5:
                u.x += (dx/dist) * 0.5
                u.z += (dz/dist) * 0.5
            else:
                # Reached target, pick new target (20% chance to attack enemy city)
                if random.random() < 0.2:
                    enemy_cities = db.query(City).filter(City.nation_id != u.nation_id).all()
                    if enemy_cities:
                        target_c = random.choice(enemy_cities)
                        u.target_x, u.target_z = target_c.x, target_c.z
                else:
                    state = db.query(GameState).first()
                    map_size = state.map_size if state else 50
                    u.target_x = max(0, min(map_size-1, u.x + random.randint(-10, 10)))
                    u.target_z = max(0, min(map_size-1, u.z + random.randint(-10, 10)))
                
            # Constrain unit position strictly within bounds
            state = db.query(GameState).first()
            map_size = state.map_size if state else 50
            u.x = max(0.0, min(float(map_size-1), u.x))
            u.z = max(0.0, min(float(map_size-1), u.z))
                
            # Basic combat: check if near enemy city
            enemy_cities = db.query(City).filter(City.nation_id != u.nation_id).all()
            for ec in enemy_cities:
                if math.hypot(ec.x - u.x, ec.z - u.z) < 2.0:
                    ec.population -= 1 # Deal damage to city population
                    u.health -= 5 # City defends itself
                    
            # Unit vs Unit combat
            enemy_units = [eu for eu in units if eu.nation_id != u.nation_id and math.hypot(eu.x - u.x, eu.z - u.z) < 1.0]
            for eu in enemy_units:
                dmg = 10
                if eu.u_type in counters.get(u.u_type, []):
                    dmg = 20 # Advantage
                elif u.u_type in counters.get(eu.u_type, []):
                    dmg = 5 # Disadvantage
                eu.health -= dmg
                    
            if u.health <= 0:
                db.delete(u)
    
    db.commit()
    
    return state, world_changed
