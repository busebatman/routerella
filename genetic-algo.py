import json
import numpy as np, random, operator, time
import copy
import math

class Stop:
    def __init__(self, x, y, numofStd, index):
        self.x = x
        self.y = y
        self.numofStd = numofStd
        self.index = index
        self.distances = []
        
    def distance(self, stop):
        return round(np.sqrt(((self.x - stop.x)**2) + ((self.y - stop.y)**2 )))
    
    def __repr__(self):
        return str(self.index)+' (' + str(self.x) + ',' + str(self.y) + ')'
    
class Bus:
    def __init__(self, capacityLimit, stops, totalCapacity):
        self.capacityLimit = capacityLimit
        self.stops = stops
        self.totalCapacity = totalCapacity
        self.pathScore = 0
        
    def score(self, fitnessValue):
        self.pathScore = fitnessValue
        
    def addStop(self, stop, index=-1):
        if index == -1:
            self.stops.insert(len(self.stops)-1,stop)
        else:
            self.stops.insert(index,stop)	
        self.totalCapacity += stop.numofStd
        
    def deleteStop(self, stop):         
        if type(stop) is Stop:
            self.totalCapacity -= stop.numofStd
            self.stops.remove(stop) 
        else:
            self.totalCapacity -= self.stops[stop].numofStd
            self.stops.remove(self.stops[stop])

    def calcCapacity(self):
        self.totalCapacity=0
        for i in self.stops:
            self.totalCapacity+=i.numofStd

    def isOver(self):
        if self.capacityLimit < self.totalCapacity:
            return True
        return False
    
class Individual:
    def __init__(self, bus_routes, bus_limit):
        self.bus_limit = bus_limit
        self.bus_routes = bus_routes
        self.totalCost = 0
        
    def calcCost(self):
        for i in range(len(self.bus_routes)):
            self.totalCost += self.bus_routes[i].pathScore
            
    def busLimitExceed(self):
        if len(self.bus_routes) > self.bus_limit:
            return len(self.bus_routes) - self.bus_limit
        else:
            return 0
        
    def updateCapacities(self):
        for i in self.bus_routes:
            i.calcCapacity()      
            
    def printType(self):
        for i in range(len(self.bus_routes)):

            print('Bus ',str(i))

            stops = self.bus_routes[i].stops
            for j in range(len(stops)):
                if stops[j].index == '0':
                   print('School\n')
                else:
                    print('Stop:', stops[j].index, '  Number of students:', str(stops[j].numofStd))
            
class Fitness:
    def __init__(self, route):
        self.route = route
        self.pathDistance = 0
        self.fitness = 0.0
        
    def routeDistance(self):
        if self.pathDistance == 0:
            for i in self.route.bus_routes:
                temp = 0
                for j in range(len(i.stops) - 1):
                    temp += i.stops[j].distances[int(i.stops[j+1].index)]
                i.score(float(temp))
                self.pathDistance += temp  
        return self.pathDistance
    
    def routeFitness(self, penalty):
        self.fitness = float(self.routeDistance())
        return self.fitness + 1000 * penalty
    
def createInd(stops, maxBus, capacityLimit, school):
    i = 0
    j = 0
    rand = 0
    buses = []
    totalCapacity = 0
    route = random.sample(stops,len(stops))           #listeyi karıştırıyor
    while i < maxBus - 1:
        totalCapacity = 0
        rand = random.randint(j+1, len(route))  
        for k in route[j:rand]:
            totalCapacity += k.numofStd  
        buses.append(Bus(capacityLimit,route[j:rand], totalCapacity)) #random listeyi random parçalara bölüyor ayrı buslar oluşturmak için
        buses[i].stops.append(school)
        i += 1
        j = rand  
        if j == len(route):
            break
    totalCapacity += route[-1].numofStd   
    if j < len(route):  #eğer max-1 kadar kullanıp bitirip çıktıysa kalanları sonuncuya yerleştir
        temp = route[j:len(route)]
        temp.append(school)
        buses.append(Bus(capacityLimit, temp, totalCapacity))
        
    return Individual(buses, maxBus)

def tournamentSelection(population, k):
    cand_parents = random.sample(population, k)          #listeyi karıştırıyor
    sort_parents = fitnessScores(cand_parents)
    return sort_parents[0][0]

def parentsSelection(population, scores, eliteNum, k):
    parents = []
    for i in range(eliteNum):
        parents.append(scores[i][0])
    for i in range(len(scores) - eliteNum):
        parents.append(tournamentSelection(population, k))
    return parents

def matingPool(population, parents, scores):
    matingpool = []
    for i in range(len(parents)):
        matingpool.append(population[parents[i]])
    return matingpool

def extractFurthestStop(Individual, extracted_stop_list, school, i):
    total_distance_list = []
    for stop_num in range(len(Individual.bus_routes[i].stops)):
        total_distance = 0
        next_stop_num = stop_num+1
        prev_stop_num = stop_num-1              
        if Individual.bus_routes[i].stops[stop_num].index!='0':
            if(stop_num == 0): #eğer ilk duraktaysam önceki durak okuldur
                prev_stop_num = len(Individual.bus_routes[i].stops)-1              
            stop1 = copy.deepcopy(Individual.bus_routes[i].stops[stop_num])
            total_distance += stop1.distances[prev_stop_num]
            total_distance += stop1.distances[next_stop_num]                    
        total_distance_list.append(total_distance)
                
    max_dist = 0
    stop_max = 0
    for dist in range(len(total_distance_list)):
        if(dist==0):
            max_dist = total_distance_list[dist]
            stop_max = 0
        if(total_distance_list[dist] > max_dist):
            max_dist = total_distance_list[dist]
            stop_max = dist
    extracted_stop = copy.deepcopy(Individual.bus_routes[i].stops[stop_max])
    extracted_stop_list.append(extracted_stop)
    Individual.bus_routes[i].deleteStop(stop_max)
                    
def extractStops(Individual, buses_array, school):
    extracted_stop_list = []
    over_bus_list = []
    #removing exceed stops from buses
    for i in buses_array:
        if(Individual.bus_routes[i].isOver()):
            over_bus_list.append(buses_array.index(i))
            #buses_array.remove(i)   #if bus capacity is over, delete it from buses_array to prevent adding stops
        while(Individual.bus_routes[i].isOver()):   
            #print("\nCapacity of bus is", Individual.bus_routes[i].totalCapacity)
            extractFurthestStop(Individual, extracted_stop_list, school, i)            
            Individual.updateCapacities()
    return extracted_stop_list

def checkDistances(Individual, bus_number, ext_stop):
    distance_list = []
    for i in Individual.bus_routes[bus_number].stops:
        distance = ext_stop.distances[int(i.index)]
        distance_list.append(distance)
    min_dist = 1000000
    i = 0
    for distance in distance_list:                    
        if(min_dist > distance and distance > 0):
            min_dist = distance
            min_dist_stop = i
        i += 1 
    return min_dist, min_dist_stop, distance_list

def addStopstoBus(Individual, buses_array, extracted_stop_list):
    ext_stop = extracted_stop_list[0]
    for bus_number in buses_array:   #Assign extra stops to random buses	
        #Check for overcapacity when adding stops to the bus	
        if ( ext_stop.numofStd < Individual.bus_routes[bus_number].capacityLimit - Individual.bus_routes[bus_number].totalCapacity ):  
            min_dist, min_dist_stop, distance_list = checkDistances(Individual, bus_number, ext_stop)
            if(min_dist_stop == 0):
                Individual.bus_routes[bus_number].addStop(ext_stop, min_dist_stop+1)
                        
            elif(min_dist_stop == len(distance_list)-1 ):
                Individual.bus_routes[bus_number].addStop(ext_stop)
                        
            elif( distance_list[min_dist_stop-1] < distance_list[min_dist_stop+1]):
                Individual.bus_routes[bus_number].addStop(ext_stop, min_dist_stop)
                        
            else:
                Individual.bus_routes[bus_number].addStop(ext_stop, min_dist_stop+1)
                                        
            extracted_stop_list.remove(ext_stop)                  
            return True

def addNewBus(Individual, extracted_stop_list, bus_limit, buses_array, busCapacity, school):
    new_arr2 = []	
    indexes = []	
    totalCapacity = 0	
    for k in range(len(extracted_stop_list)):	
        if totalCapacity + extracted_stop_list[k].numofStd > busCapacity:	
            break	
        totalCapacity += extracted_stop_list[k].numofStd	
        new_arr2.append(copy.deepcopy( extracted_stop_list[k]))	
        indexes.append(k)	
    indx = 0	
    for h in indexes:	
        extracted_stop_list.remove(extracted_stop_list[h - indx])	
        indx += 1		
    new_arr2.append(school)	
    Individual.bus_routes.append(Bus(busCapacity, new_arr2, totalCapacity))	 
    buses_array.append(len(buses_array))
    
def addExtraStops(Individual, buses_array, extracted_stop_list, bus_limit, busCapacity, school):
    while extracted_stop_list:	
        is_add_existed_bus = False
        if buses_array:	
            is_add_existed_bus = addStopstoBus(Individual, buses_array, extracted_stop_list)    
        if(not is_add_existed_bus):      
            addNewBus(Individual, extracted_stop_list, bus_limit, buses_array, busCapacity, school)
    
def repair(Individual, school, bus_limit, busCapacity):    
    buses_array = []
    for i in range(len(Individual.bus_routes)):
        buses_array.append(i)        
    extracted_stop_list = extractStops(Individual, buses_array, school)              
    #if there is no capacity exceed exit function
    if (len(extracted_stop_list) == 0):
        return 1    
    random.shuffle(buses_array)  
    addExtraStops(Individual, buses_array, extracted_stop_list, bus_limit, busCapacity, school)     #adding exceed stops to other buses	
    return Individual   

def extractStopsRandom(Individual, school):    
    extracted_stop_list = []
    #removing exceed stops from buses
    for i in range(len(Individual.bus_routes)):
        while(Individual.bus_routes[i].isOver()):
            random_stop_num = random.randint(0, len(Individual.bus_routes[i].stops) - 1)  #select random stop	

            if  Individual.bus_routes[i].stops[random_stop_num].index != '0':	#kaldırabiliriz
                extracted_stop = copy.deepcopy(Individual.bus_routes[i].stops[random_stop_num])           	
                extracted_stop_list.append(extracted_stop)  #Collect excess stops in the list 	
                Individual.bus_routes[i].deleteStop(random_stop_num)	
                Individual.updateCapacities()

    return extracted_stop_list, Individual
                
def addStopstoBusRandom(Individual, buses_random_array, extracted_stop_list):
    #adding exceed stops to other buses	
    ext_stop=extracted_stop_list[0]       
    for bus_number in buses_random_array:   #Assign extra stops to random buses	
        #print("------------------------------------")
        #print("\nfazla duraklar ekleniyor")
        #Check for overcapacity when adding stops to the bus	
        if ( ext_stop.numofStd < Individual.bus_routes[bus_number].capacityLimit - Individual.bus_routes[bus_number].totalCapacity ):	
            Individual.bus_routes[bus_number].addStop(ext_stop)
            #if(Individual.bus_routes[bus_number].totalCapacity>30):
                #print("Individual totalCapacity after stop addition", Individual.bus_routes[bus_number].totalCapacity)
            extracted_stop_list.remove(ext_stop)                   
            return True
                                
def addExtraStopsRandom(Individual, buses_random_array, extracted_stop_list, bus_limit, busCapacity):
    while extracted_stop_list:	
        is_add_existed_bus = False
        if buses_random_array:	
            is_add_existed_bus = addStopstoBusRandom(Individual, buses_random_array, extracted_stop_list)         
        if(not is_add_existed_bus):
            addNewBus(Individual, extracted_stop_list, bus_limit, buses_random_array, busCapacity)
            
def repairRandom(Individual, school, bus_limit, busCapacity):
    buses_random_array = []

    for i in range(len(Individual.bus_routes)):
        buses_random_array.append(i)   
    random.shuffle(buses_random_array)

    extracted_stop_list, Individual = extractStopsRandom(Individual, school)    
    
    """for ind in Individual.bus_routes:
         if ind.totalCapacity > 30:  
             print("\n--------stops: ", ind.stops)
             print("\n--------exceed", ind.totalCapacity)"""
    #if there is no capacity exceed exit function
    if (len(extracted_stop_list) == 0):
        return 1     
    addExtraStopsRandom(Individual, buses_random_array, extracted_stop_list, bus_limit, busCapacity) 
    return Individual   

def repairPop(population, school, option, busCapacity, bus_limit):	
    repairedPop = []	
    for i in population:
        if option == 0:
            temp = repair(i, school, bus_limit, busCapacity)
        elif option == 1:
            temp = repairRandom(i, school, bus_limit, busCapacity)
        """TODO: repairden 1 değil kendisini döndürmeyi dene"""
        if type(temp) is Individual:
            """for j in temp.bus_routes:

                if j.totalCapacity > 30:  
                    print("\nstops: ", j.stops)
                    print("\nexceed")"""
            repairedPop.append(temp)	
        else:	
            repairedPop.append(i)	
    return repairedPop
                     
def firstPopulation(stops, maxBus, busCapacity, number, school):
    firstPop = []
    for i in range(number):
        firstPop.append(createInd(stops, maxBus, busCapacity, school))
    return firstPop

def fitnessScores(population):
    scores = {}
    for i in range(len(population)):
        scores[i] = Fitness(population[i]).routeFitness(population[i].busLimitExceed())
    return sorted(scores.items(), key = operator.itemgetter(1))	

def fitnessScoresPure(population):
    scores = {}
    for i in range(len(population)):
        scores[i] = Fitness(population[i]).routeDistance()
    return sorted(scores.items(), key = operator.itemgetter(1))

def route_mutate(indv, mutationRate):
    indvc = copy.deepcopy(indv)
    for i in range(len(indvc.bus_routes)):
        rand = random.random()
        if rand < mutationRate:
            for j in range(len(indvc.bus_routes[i].stops)):
                if int(indvc.bus_routes[i].stops[j].index) != 0:
                    rand = random.random()
                    if rand < mutationRate:
                        if len(indvc.bus_routes[i].stops) > 2:
                            rand1 = random.randint(0, len(indvc.bus_routes[i].stops) - 1)
                            while (rand1 == j) or (int(indvc.bus_routes[i].stops[rand1].index)==0):
                                rand1 = random.randint(0, len(indvc.bus_routes[i].stops) - 1)  
                            temp = copy.deepcopy(indvc.bus_routes[i].stops[j])
                            #print("bus ", i, " stop ", indvc.bus_routes[i].stops[j].index, " with stop ", indvc.bus_routes[i].stops[rand1].index)
                            indvc.bus_routes[i].stops[j] = copy.deepcopy(indvc.bus_routes[i].stops[rand1])
                            indvc.bus_routes[i].stops[rand1] = temp
                            break
                        else:
                            continue
    indvc.updateCapacities()
    #bunun yerine crossdaki gibi mutasyon yapıp elitelik te yapabiliriz
    if fitnessScores([indv,indvc])[0][0]==0:
        return indv
    return indvc

def bus_mutate(indv, mutationRate):
    indvc = copy.deepcopy(indv)
    for i in range(len(indvc.bus_routes)):
        rand = random.random()
        if rand < mutationRate:
            rand1_j = random.randint(0, len(indvc.bus_routes[i].stops) - 1) 
            while (int(indvc.bus_routes[i].stops[rand1_j].index)==0):
                rand1_j = random.randint(0, len(indvc.bus_routes[i].stops) - 1)
            rand2_i = random.randint(0, len(indvc.bus_routes) - 1)  
            while rand2_i==i:
                rand2_i = random.randint(0, len(indvc.bus_routes) - 1)
            rand2_j = random.randint(0, len(indvc.bus_routes[rand2_i].stops) - 1) 
            while (int(indvc.bus_routes[rand2_i].stops[rand2_j].index)==0):
                rand2_j = random.randint(0, len(indvc.bus_routes[rand2_i].stops) - 1)
            #print("bus ", i, " stop ", rand1_j, "and bus ", rand2_i, " stop ", rand2_j)
            temp = copy.deepcopy(indvc.bus_routes[i].stops[rand1_j])
            indvc.bus_routes[i].stops[rand1_j] = copy.deepcopy(indvc.bus_routes[rand2_i].stops[rand2_j])
            indvc.bus_routes[rand2_i].stops[rand2_j] = temp
            break 

    indvc.updateCapacities()
    if fitnessScores([indv,indvc])[0][0]==0:
        return indv
    return indvc         

def exchange_mutate(ind, mutationRate,real_stops,bus_limit,sch):
    individual = copy.deepcopy(ind)
    rand = random.random()
    if rand < mutationRate:
        if (len(individual.bus_routes) == 1): # tek otobüsle çaprazlama yapamam
            return individual
    
        rand1 = random.randint(0, len(individual.bus_routes) - 1)
        rand2 = random.randint(0, len(individual.bus_routes) - 1)
    
        while (rand1 == rand2):
            rand2 = random.randint(0, len(individual.bus_routes) - 1)
    
        school = individual.bus_routes[rand1].stops[-1] # okulu ayırıyorum
        maleChromosome = individual.bus_routes[rand1].stops[ : -1]
        femaleChromosome = individual.bus_routes[rand2].stops[ : -1]
    
        if (not len(maleChromosome) or  not len(femaleChromosome)): # aslında olmaması lazım ama sadece okula giden otobüsler var, onlarla da çaprazlama yapamam
            return individual
    
        rand3 = math.ceil(len(maleChromosome) / 2)
        rand4 = math.ceil(len(femaleChromosome) / 2)

        child1Chromosome = maleChromosome[0 : rand3] + femaleChromosome[rand4 : len(femaleChromosome)] # sıralar değişebilir
        child2Chromosome = maleChromosome[rand3 : len(maleChromosome)] + femaleChromosome[0 : rand4]
    
        individual.bus_routes[rand1].stops = child1Chromosome
        individual.bus_routes[rand1].stops.append(school)
        individual.bus_routes[rand2].stops = child2Chromosome
        individual.bus_routes[rand2].stops.append(school)

    individual.updateCapacities()
    if fitnessScores([ind,individual])[0][0]==0:
        return ind
    return individual
  
def mutatePop(population, mutationRate, mutation_op, school, real_stops, bus_limit, option, busCapacity):
    mutatedpop = []
    for i in population:
        if mutation_op == 0:
            mutatedpop.append(bus_mutate(i, mutationRate))
        elif mutation_op == 1:
            mutatedpop.append(route_mutate(i, mutationRate))
        elif mutation_op == 2:
            mutatedpop.append(exchange_mutate(i, mutationRate,real_stops,bus_limit,school))
    return repairPop(mutatedpop, school, option, busCapacity, bus_limit)

def repairAfterCrossover(child, school, real_stops, bus_limit, busCapacity,):
    indices = []
    empty_buses = []
    bus_length = len(child.bus_routes)

    # DELETE REPEATED STOPS
    for i in range(bus_length):
        stops = child.bus_routes[i].stops
        stops_length = len(stops)
        j = 0
        while j < stops_length:
            if (stops[j].index == "0"):
                if len(stops) == 1:
                    empty_buses.append(i)
                break
            if (stops[j].index in indices):
                stops.remove(stops[j])
                stops_length -= 1
            else:
                indices.append(stops[j].index)
                j += 1
	
    inx = 0
    for i in empty_buses:
        child.bus_routes.remove(child.bus_routes[i - inx])
        inx += 1
        
    """TODO:realstops ve normalstops aynı mı öyleeyse real kullanabiliriz"""
    # ADD REMOVED STOPS TO NEXT BUS
    normal_stops = []
    for i in range(len(real_stops)): # 10 -- durak sayısı / normalde parametere olarak alınacak
        normal_stops.append(str(i + 1))

    removed_stop_indices = [x for x in normal_stops if x not in indices]
    removed_stops = []
    length_removed_stops = len(removed_stop_indices)

    totalCapacity = 0
    if (length_removed_stops != 0):
        for i in removed_stop_indices:
            totalCapacity += real_stops[int(i) - 1].numofStd
            removed_stops.append(real_stops[int(i) - 1])

        if len(child.bus_routes) < bus_limit:
            removed_stops.append(school)
            child.bus_routes.append(Bus(busCapacity, removed_stops, totalCapacity))
        else:
            for i in removed_stops:
                child.bus_routes[0].addStop(i)	 
    
    child.updateCapacities()
    return child

def crossover(parent1, parent2, school, stops, crossoverRate, bus_limit, busCapacity):
    rand = random.random()

    if rand < crossoverRate:
        parent1 = copy.deepcopy(parent1.bus_routes)
        parent2 = copy.deepcopy(parent2.bus_routes)

        x = math.ceil(len(parent1) / 2)
        y = math.ceil(len(parent2) / 2)

        child = Individual(parent1[0 : x] + parent2[y : len(parent2)], bus_limit)
    
        return repairAfterCrossover(child, school, stops, bus_limit, busCapacity)

    else:
        rand = random.randint(0, 2) 

        if (rand == 0):
            return parent1

        return parent2

def breedPop(matingpool, eliteNum, school, stops, bus_limit, option, crossoverRate, busCapacity):
    children = []
    length = len(matingpool)
    for i in range(eliteNum):
        children.append(matingpool[i])
    for i in range(length - eliteNum):
        children.append(crossover(matingpool[i], matingpool[length - i - 1], school, stops, crossoverRate, bus_limit, busCapacity))  

    return repairPop(children, school, option, busCapacity, bus_limit)

def nextGeneration(currentGen, eliteSize, mutationRate, mutation_op, k, school, stops, bus_limit, repairOption, crossoverRate, busCapacity):
    topScores = fitnessScores(currentGen)
    parents = parentsSelection(currentGen, topScores, eliteSize, k)
    matingpool = matingPool(currentGen, parents, topScores)
    children = breedPop(matingpool, eliteSize, school, stops, bus_limit, repairOption, crossoverRate, busCapacity)
    nextgeneration = mutatePop(children, mutationRate, mutation_op, school, stops, bus_limit, repairOption, busCapacity)
    return nextgeneration

def geneticAlgorithm(stops, maxBus, busCapacity, popSize, eliteSize, mutationRate, mutation_op, generations, k, school, repairOption, crossoverRate):
    currentPop = firstPopulation(stops, maxBus, busCapacity, popSize, school)
    currentPop = repairPop(currentPop, school, repairOption, busCapacity, maxBus)        
    
    fs=fitnessScores(currentPop)
    print("Initial distance: " + str(fs[0][1]))
    # output_file.write("Initial distance: " + str(fs[0][1]))
    routee = currentPop[fs[0][0]]
    # routee.printType(output_file)

    if currentPop[fs[0][0]].busLimitExceed()!=0:
        fsp=fitnessScoresPure(currentPop)
        print("Score without penalty: ", str(fsp[0][1]))
        # output_file.write("\nScore without penalty: " + str(fsp[0][1]))

    for i in range(generations):
        currentPop = nextGeneration(currentPop, eliteSize, mutationRate, mutation_op, k, school,stops, maxBus, repairOption, crossoverRate, busCapacity)
        fs = fitnessScores(currentPop)
        # print("Current distance: " + str(fs[0][1]))
        # output_file.write("\nCurrent distance: " + str(fs[0][1]))

    fs = fitnessScores(currentPop)
    print("Final distance: " + str(fs[0][1]))
    # output_file.write("\nFinal distance: " + str(fs[0][1]))

    if currentPop[fs[0][0]].busLimitExceed()!=0:
        fsp=fitnessScoresPure(currentPop)
        print("Score without penalty: ", str(fsp[0][1]))
        # output_file.write("\nScore without penalty: " + str(fsp[0][1]))

    bestRouteIndex = fs[0][0]
    bestRoute = currentPop[bestRouteIndex]
    
    return bestRoute

def lambda_handler(event, context):
    
    body = json.loads(event['body'])
    busStopCount = body['busStopCount']
    maxBusCount = body['maxBusCount']
    busCapacity = body['busCapacity']
    optimalityDegree = body['optimalityDegree']
    locations = body['locations']
    
    maxBus = maxBusCount
    busCapacity = busCapacity
    
    popSize = 10
    eliteSize = 1
    #mutationRate = 0.5 / len(stops)
    mutation_op = 0
    generations = 10
    k = 1
    repairOption = 0
    crossoverRate = 0.5
        
    #route = geneticAlgorithm(stops,school, maxBus, busCapacity, popSize, eliteSize, mutationRate, mutation_op, generations, k, repairOption, crossoverRate)

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(
              "busStopCount: " + str(busStopCount)
            + ", maxBusCount: " + str(maxBusCount)
            + ", busCapacity: " + str(busCapacity)
            + ", optimalityDegree: " + str(optimalityDegree)
            + ", locations: " + str(locations)
        )
    }


    """
    bu dosyayı eklememin nedeni şu: şu anki sorunumuz, locationları file'dan okumak yerine 
    gönderdiğimiz formatta okuyup işlem yapmasını sağlayabilmek.

    bilgiler artık bu şekilde geliyor:
    {
        "busStopCount": 3,
        "maxBusCount": 1,
        "busCapacity": 16,
        "optimalityDegree": 1,
        "locations": "0 4151 2753 0 1 4118 2840 3 2 4105 2937 5 "
    }

    locations için:
    okul -> 0 4151 2753 0
    1. durak -> 1 4118 2840 3
    2. durak -> 2 4105 2937 5
    ... şeklinde. file'a benzetmeye çalıştım.
    artık file'da line line okumak yerine 4lü 4lü gruplayabiliriz belki.

    optimality degree için test için yaptığımız loopa benzer bir loop yapabiliriz.

    bir diğer sorun da şu: 
    şu anki dönen cevabı response olarak dönemiyoruz.
    array - object vs kabul etmiyor.
    string olarak dönmek lazım.
    yukarıdaki return'deki body gibi mesela.
    """